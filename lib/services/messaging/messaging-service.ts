/**
 * Unified Messaging Service
 * Orchestrates email and WhatsApp messaging with configuration management
 */

import { prisma } from '@/lib/db';
import { IMessagingService, EmailMessage, WhatsAppMessage, MessageResult, EmailConfig, WhatsAppConfig } from './types';
import { EmailService } from './email-service';
import { getWhatsAppProvider } from './providers';
import { decryptCredential, encryptCredential } from './crypto';

export class MessagingService implements IMessagingService {
    private emailService = new EmailService();

    /**
     * Send an email using the configuration for the given client
     * @param message - Email message to send
     * @param clientId - Client ID (REQUIRED)
     * @param options - Optional sending options
     */
    async sendEmail(message: EmailMessage, clientId?: string, options?: { isAuto?: boolean; templateId?: string }): Promise<MessageResult> {
        try {
            if (!clientId) {
                return {
                    success: false,
                    error: 'Client ID is required for sending emails',
                };
            }

            const config = await this.getEmailConfig(clientId);

            if (!config) {
                return {
                    success: false,
                    error: `No email configuration found for client: ${clientId}`
                };
            }

            // Centralized control logic: skip if it's an auto-send and auto-send is disabled
            if (options?.isAuto && !config.autoSend) {
                console.log(`[MessagingService] Auto-send email disabled for client: ${clientId}. Skipping.`);
                return {
                    success: false,
                    error: 'Auto-send email is disabled for this configuration'
                };
            }

            const result = await this.emailService.send(message, config);

            // Log the message
            await this.logMessage({
                configId: config.id,
                templateId: options?.templateId,
                channel: 'email',
                recipient: Array.isArray(message.to) ? message.to.join(', ') : message.to,
                subject: message.subject,
                message: message.text || message.html || '',
                status: result.success ? 'sent' : 'failed',
                error: result.error,
                metadata: result.details,
                sentAt: result.success ? new Date() : null,
            });

            return result;
        } catch (error: any) {
            console.error('[MessagingService] sendEmail error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send email',
            };
        }
    }

    /**
     * Send a WhatsApp message using the configuration for the given client
     * @param message - WhatsApp message to send
     * @param clientId - Client ID (REQUIRED)
     * @param options - Optional sending options
     */
    async sendWhatsApp(message: WhatsAppMessage, clientId?: string, options?: { isAuto?: boolean; templateId?: string }): Promise<MessageResult> {
        try {
            if (!clientId) {
                return {
                    success: false,
                    error: 'Client ID is required for sending WhatsApp messages',
                };
            }

            const config = await this.getWhatsAppConfig(clientId);

            if (!config) {
                return {
                    success: false,
                    error: `No WhatsApp configuration found for client: ${clientId}`
                };
            }

            // Centralized control logic: skip if it's an auto-send and auto-send is disabled
            if (options?.isAuto && !config.autoSend) {
                console.log(`[MessagingService] Auto-send WhatsApp disabled for client: ${clientId}. Skipping.`);
                return {
                    success: false,
                    error: 'Auto-send WhatsApp is disabled for this configuration'
                };
            }

            const provider = getWhatsAppProvider(config.provider);
            if (!provider) {
                return {
                    success: false,
                    error: `Unknown WhatsApp provider: ${config.provider}`
                };
            }

            const result = await provider.send(message, config);

            // Log the message
            await this.logMessage({
                configId: config.id,
                templateId: options?.templateId,
                channel: 'whatsapp',
                recipient: message.to,
                subject: null,
                message: message.text,
                status: result.success ? 'sent' : 'failed',
                error: result.error,
                metadata: result.details,
                sentAt: result.success ? new Date() : null,
            });

            return result;
        } catch (error: any) {
            console.error('[MessagingService] sendWhatsApp error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send WhatsApp message',
            };
        }
    }

    /**
     * Get default template for auto-send
     * @param type - 'email' or 'whatsapp'
     * @param clientId - Client ID
     * @returns Default template for the type and client, or null if none found
     */
    async getDefaultTemplate(type: 'email' | 'whatsapp', clientId?: string): Promise<any> {
        try {
            if (clientId) {
                const clientTemplate = await prisma.messageTemplate.findFirst({
                    where: {
                        type,
                        isDefault: true,
                        status: 'active',
                        clientId
                    }
                });

                if (clientTemplate) {
                    console.log(`[MessagingService] Found client default template: ${clientTemplate.name}`);
                    return clientTemplate;
                }
            }


            // 2. Fallback to global default template
            const globalTemplate = await prisma.messageTemplate.findFirst({
                where: {
                    type,
                    isDefault: true,
                    status: 'active',
                    scope: 'global'
                }
            });

            if (globalTemplate) {
                return globalTemplate;
            }

            console.log(`[MessagingService] No default ${type} template found (client: ${clientId} or global)`);
            return null;
        } catch (error) {
            console.error('[MessagingService] Error getting default template:', error);
            return null;
        }
    }

    /**
     * Get messaging configuration for a client
     */
    async getConfig(clientId: string): Promise<any> {
        const config = await prisma.messagingConfig.findFirst({
            where: { clientId },
        });

        if (!config) {
            return null;
        }

        // Decrypt sensitive fields
        return {
            ...config,
            smtpPassword: config.smtpPassword ? decryptCredential(config.smtpPassword) : null,
            whatsappApiKey: config.whatsappApiKey ? decryptCredential(config.whatsappApiKey) : null,
        };
    }

    /**
     * Get the setup status for a client
     */
    async getStatus(clientId: string): Promise<{
        clientMessagingEnabled: boolean;
        emailSetup: boolean;
        whatsappSetup: boolean;
        emailAutoSend: boolean;
        whatsappAutoSend: boolean;
        whatsappTimeout: number;
        smtpTimeout: number;
        whatsappTemplate?: string;
        isInherited: boolean; // Always false now
    }> {
        const config = await this.getConfig(clientId);

        if (config) {
            const emailSetup = !!(config.smtpEnabled && config.smtpHost && config.smtpPassword);
            const whatsappSetup = !!(config.whatsappEnabled && config.whatsappApiKey);

            return {
                clientMessagingEnabled: !!config.clientMessagingEnabled,
                emailSetup,
                whatsappSetup,
                // Auto-send can only be true if the channel is actually set up
                emailAutoSend: emailSetup && !!config.smtpAutoSend,
                whatsappAutoSend: whatsappSetup && !!config.whatsappAutoSend,
                whatsappTimeout: config.whatsappTimeout || 0,
                smtpTimeout: config.smtpTimeout || 0,
                whatsappTemplate: config.whatsappTemplate || '',
                isInherited: false
            };
        }

        return {
            clientMessagingEnabled: false,
            emailSetup: false,
            whatsappSetup: false,
            emailAutoSend: false,
            whatsappAutoSend: false,
            whatsappTimeout: 0,
            smtpTimeout: 0,
            isInherited: false,
        };
    }

    /**
     * Update messaging configuration for a client
     */
    async updateConfig(clientId: string, _type: string, config: any): Promise<void> {
        // Encrypt sensitive fields
        const encryptedConfig = {
            ...config,
            smtpPassword: config.smtpPassword ? encryptCredential(config.smtpPassword) : null,
            whatsappApiKey: config.whatsappApiKey ? encryptCredential(config.whatsappApiKey) : null,
        };

        // Check if config exists for this client
        const existing = await prisma.messagingConfig.findFirst({
            where: { clientId },
        });

        const data: any = {
            ...encryptedConfig,
            config: encryptedConfig,
            type: 'client', // Enforce type
        };

        if (existing) {
            // Update existing config
            await prisma.messagingConfig.update({
                where: { id: existing.id },
                data,
            });
        } else {
            // Create new config for client
            await prisma.messagingConfig.create({
                data: {
                    ...data,
                    clientId,
                },
            });
        }
    }

    /**
     * Get email configuration for a client
     */
    private async getEmailConfig(clientId: string): Promise<EmailConfig | null> {
        const config = await prisma.messagingConfig.findFirst({
            where: {
                clientId,
                smtpEnabled: true,
            },
        });

        if (config && config.smtpHost && config.smtpPassword) {
            return {
                id: config.id,
                host: config.smtpHost,
                port: config.smtpPort || 587,
                username: config.smtpUsername || '',
                password: decryptCredential(config.smtpPassword),
                encryption: (config.smtpEncryption as 'TLS' | 'SSL') || 'TLS',
                fromName: config.smtpFromName || 'ULS Transport',
                fromEmail: config.smtpFromEmail || 'noreply@uls-transport.com',
                autoSend: config.smtpAutoSend,
            };
        }

        return null;
    }

    /**
     * Get WhatsApp configuration for a client
     */
    private async getWhatsAppConfig(clientId: string): Promise<WhatsAppConfig | null> {
        const config = await prisma.messagingConfig.findFirst({
            where: {
                clientId,
                whatsappEnabled: true,
            },
        });

        if (config && config.whatsappApiKey) {
            return {
                id: config.id,
                provider: config.whatsappProvider || 'wasender',
                apiKey: decryptCredential(config.whatsappApiKey),
                apiUrl: config.whatsappApiUrl || 'https://www.wasenderapi.com/api/send-message',
                autoSend: config.whatsappAutoSend,
                timeout: config.whatsappTimeout,
                template: config.whatsappTemplate || undefined,
            };
        }

        return null;
    }

    /**
     * Log a sent message to the database
     */
    private async logMessage(data: {
        configId: string;
        templateId?: string;
        channel: string;
        recipient: string;
        subject: string | null;
        message: string;
        status: string;
        error?: string;
        metadata?: any;
        sentAt: Date | null;
    }): Promise<void> {
        try {
            await prisma.messageLog.create({
                data: {
                    configId: data.configId,
                    templateId: data.templateId || null,
                    channel: data.channel,
                    recipient: data.recipient,
                    subject: data.subject,
                    message: data.message,
                    status: data.status,
                    error: data.error,
                    metadata: data.metadata,
                    sentAt: data.sentAt,
                },
            });
        } catch (error) {
            console.error('[MessagingService] Failed to log message:', error);
            // Don't throw - logging failure shouldn't fail the message send
        }
    }
}
