/**
 * Unified Messaging Service
 *
 * ULS Transport sends through one SMTP account and one WhatsApp number, so
 * there is one configuration for the whole company. Every method here used
 * to take a `clientId` and look up that client's own credentials — a shape
 * inherited from a multi-tenant codebase. A client is who you write *to*;
 * it never had a mail server of its own.
 *
 * Whether a given client is written to is `Client.notificationsEnabled`,
 * checked by the caller (see lib/server/expedition-notifications.ts).
 */

import { prisma } from '@/lib/db';
import type { MessagingConfig } from '@prisma/client';
import { IMessagingService, EmailMessage, WhatsAppMessage, MessageResult, EmailConfig, WhatsAppConfig } from './types';
import { EmailService } from './email-service';
import { getWhatsAppProvider } from './providers';
import { decryptCredential, encryptCredential } from './crypto';
import { errorMessage } from '@/lib/errors';

/** The one and only configuration row. */
const SINGLETON_KEY = 'uls';

/** Everything the configuration screen and the senders need to know. */
export interface MessagingStatus {
    emailSetup: boolean;
    whatsappSetup: boolean;
    emailAutoSend: boolean;
    whatsappAutoSend: boolean;
    whatsappTimeout: number;
    smtpTimeout: number;
    whatsappTemplate?: string;
    /** Operational ping to the ULS team. */
    staffNotifyEnabled: boolean;
    staffNotifyMode: string;
    staffNotifyPhone: string | null;
    staffNotifyGroupId: string | null;
}

export class MessagingService implements IMessagingService {
    private emailService = new EmailService();

    /**
     * Send an email through the ULS SMTP account.
     *
     * @param message - Email message to send
     * @param options - `isAuto` marks an automatic send, which is skipped
     *                  unless auto-send is switched on
     */
    async sendEmail(
        message: EmailMessage,
        options?: { isAuto?: boolean; templateId?: string }
    ): Promise<MessageResult> {
        try {
            const config = await this.getEmailConfig();

            if (!config) {
                return {
                    success: false,
                    error: "L'envoi d'e-mail n'est pas configuré (Messagerie → Configuration).",
                };
            }

            // Centralized control logic: skip if it's an auto-send and auto-send is disabled
            if (options?.isAuto && !config.autoSend) {
                console.log('[MessagingService] Auto-send email disabled. Skipping.');
                return {
                    success: false,
                    error: 'Auto-send email is disabled',
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
        } catch (error) {
            console.error('[MessagingService] sendEmail error:', error);
            return {
                success: false,
                error: errorMessage(error, 'Failed to send email'),
            };
        }
    }

    /**
     * Send a WhatsApp message through the ULS number.
     */
    async sendWhatsApp(
        message: WhatsAppMessage,
        options?: { isAuto?: boolean; templateId?: string }
    ): Promise<MessageResult> {
        try {
            const config = await this.getWhatsAppConfig();

            if (!config) {
                return {
                    success: false,
                    error: "L'envoi WhatsApp n'est pas configuré (Messagerie → Configuration).",
                };
            }

            // Centralized control logic: skip if it's an auto-send and auto-send is disabled
            if (options?.isAuto && !config.autoSend) {
                console.log('[MessagingService] Auto-send WhatsApp disabled. Skipping.');
                return {
                    success: false,
                    error: 'Auto-send WhatsApp is disabled',
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
        } catch (error) {
            console.error('[MessagingService] sendWhatsApp error:', error);
            return {
                success: false,
                error: errorMessage(error, 'Failed to send WhatsApp message'),
            };
        }
    }

    /**
     * Send a WhatsApp message to a group rather than a phone number.
     *
     * The provider has supported groups all along; the service did not
     * expose it, so the "notifier un groupe" option in the configuration
     * screen had no way to reach it.
     */
    async sendWhatsAppToGroup(groupId: string, text: string): Promise<MessageResult> {
        try {
            const config = await this.getWhatsAppConfig();

            if (!config) {
                return {
                    success: false,
                    error: "L'envoi WhatsApp n'est pas configuré (Messagerie → Configuration).",
                };
            }

            const provider = getWhatsAppProvider(config.provider);
            if (!provider?.sendToGroup) {
                return {
                    success: false,
                    error: `Provider ${config.provider} does not support group messages`
                };
            }

            const result = await provider.sendToGroup(groupId, text, config);

            await this.logMessage({
                configId: config.id,
                channel: 'whatsapp',
                recipient: groupId,
                subject: null,
                message: text,
                status: result.success ? 'sent' : 'failed',
                error: result.error,
                metadata: result.details,
                sentAt: result.success ? new Date() : null,
            });

            return result;
        } catch (error) {
            console.error('[MessagingService] sendWhatsAppToGroup error:', error);
            return {
                success: false,
                error: errorMessage(error, 'Failed to send WhatsApp group message'),
            };
        }
    }

    /**
     * Default template for automatic sends.
     *
     * A client may still have templates of its own — per-client *wording* is
     * legitimate in a way that per-client *credentials* never were — so a
     * client template outranks the global one.
     */
    async getDefaultTemplate(type: 'email' | 'whatsapp', clientId?: string) {
        try {
            if (clientId) {
                const clientTemplate = await prisma.messageTemplate.findFirst({
                    where: { type, isDefault: true, status: 'active', clientId },
                });

                if (clientTemplate) return clientTemplate;
            }

            return await prisma.messageTemplate.findFirst({
                where: { type, isDefault: true, status: 'active', scope: 'global' },
            });
        } catch (error) {
            console.error('[MessagingService] Error getting default template:', error);
            return null;
        }
    }

    /**
     * The ULS configuration, with credentials decrypted.
     *
     * Always returns a row: the migration seeds an empty one, and this
     * recreates it if it is ever removed, so the screen always has
     * something to edit.
     */
    async getConfig(): Promise<MessagingConfig> {
        const config = await prisma.messagingConfig.upsert({
            where: { key: SINGLETON_KEY },
            update: {},
            create: { key: SINGLETON_KEY },
        });

        return {
            ...config,
            smtpPassword: config.smtpPassword ? decryptCredential(config.smtpPassword) : null,
            whatsappApiKey: config.whatsappApiKey ? decryptCredential(config.whatsappApiKey) : null,
        };
    }

    /** What is set up and what is switched on. */
    async getStatus(): Promise<MessagingStatus> {
        const config = await this.getConfig();

        const emailSetup = !!(config.smtpEnabled && config.smtpHost && config.smtpPassword);
        const whatsappSetup = !!(config.whatsappEnabled && config.whatsappApiKey);

        return {
            emailSetup,
            whatsappSetup,
            // Auto-send can only be true if the channel is actually set up
            emailAutoSend: emailSetup && config.smtpAutoSend,
            whatsappAutoSend: whatsappSetup && config.whatsappAutoSend,
            whatsappTimeout: config.whatsappTimeout || 0,
            smtpTimeout: config.smtpTimeout || 0,
            whatsappTemplate: config.whatsappTemplate || '',
            // Staff pings ride the same WhatsApp credentials, so they are
            // only live once that channel is actually configured.
            staffNotifyEnabled: whatsappSetup && config.staffNotifyEnabled,
            staffNotifyMode: config.staffNotifyMode || 'phone',
            staffNotifyPhone: config.staffNotifyPhone || null,
            staffNotifyGroupId: config.staffNotifyGroupId || null,
        };
    }

    /** Write the configuration, encrypting the credentials. */
    async updateConfig(config: Record<string, unknown>): Promise<void> {
        const data = {
            ...config,
            smtpPassword: config.smtpPassword
                ? encryptCredential(String(config.smtpPassword))
                : null,
            whatsappApiKey: config.whatsappApiKey
                ? encryptCredential(String(config.whatsappApiKey))
                : null,
        };

        await prisma.messagingConfig.upsert({
            where: { key: SINGLETON_KEY },
            update: data,
            create: { ...data, key: SINGLETON_KEY },
        });
    }

    /** SMTP settings, or null when e-mail is not usable. */
    private async getEmailConfig(): Promise<EmailConfig | null> {
        const config = await prisma.messagingConfig.findUnique({
            where: { key: SINGLETON_KEY },
        });

        if (config?.smtpEnabled && config.smtpHost && config.smtpPassword) {
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

    /** WhatsApp settings, or null when WhatsApp is not usable. */
    private async getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
        const config = await prisma.messagingConfig.findUnique({
            where: { key: SINGLETON_KEY },
        });

        if (config?.whatsappEnabled && config.whatsappApiKey) {
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
        metadata?: unknown;
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
                    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                    sentAt: data.sentAt,
                },
            });
        } catch (error) {
            console.error('[MessagingService] Failed to log message:', error);
            // Don't throw - logging failure shouldn't fail the message send
        }
    }
}
