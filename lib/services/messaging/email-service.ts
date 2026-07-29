/**
 * Email Service Implementation
 * Handles SMTP email sending using nodemailer
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { IEmailService, EmailMessage, EmailConfig, MessageResult } from './types';

export class EmailService implements IEmailService {
    /**
     * Validates an email configuration by attempting to verify the SMTP connection
     */
    async validateConfig(config: EmailConfig): Promise<boolean> {
        try {
            const transporter = this.createTransporter(config);
            await transporter.verify();
            console.log('[EmailService] Configuration validated successfully');
            return true;
        } catch (error) {
            console.error('[EmailService] Config validation failed:', error);
            return false;
        }
    }

    /**
     * Sends an email using the provided configuration
     */
    async send(message: EmailMessage, config: EmailConfig): Promise<MessageResult> {
        try {
            const transporter = this.createTransporter(config);

            // Prepare email options
            const mailOptions = {
                from: message.from || `"${config.fromName}" <${config.fromEmail}>`,
                to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
                subject: message.subject,
                text: message.text,
                html: message.html,
            };

            console.log('[EmailService] Sending email:', {
                to: mailOptions.to,
                subject: message.subject,
            });

            // Send email
            const info = await transporter.sendMail(mailOptions);

            console.log('[EmailService] Email sent successfully:', {
                messageId: info.messageId,
                response: info.response,
            });

            return {
                success: true,
                messageId: info.messageId,
                details: {
                    response: info.response,
                    accepted: info.accepted,
                    rejected: info.rejected,
                },
            };
        } catch (error: any) {
            console.error('[EmailService] Failed to send email:', error);
            return {
                success: false,
                error: error.message || 'Failed to send email',
                details: error,
            };
        }
    }

    /**
     * Creates a nodemailer transporter with the given configuration
     */
    private createTransporter(config: EmailConfig): Transporter {
        console.log('[EmailService] Creating transporter:', {
            host: config.host,
            port: config.port,
            encryption: config.encryption,
            username: config.username,
        });

        // Auto-detect settings if not explicit or if mismatch
        let encryption = config.encryption;
        if (!encryption) {
            if (config.port === 465) encryption = 'SSL';
            else if (config.port === 587) encryption = 'TLS';
        }

        const isSSL = encryption === 'SSL';
        const isTLS = encryption === 'TLS';

        // For Hostinger and similar providers, use specific settings
        const transportOptions: any = {
            host: config.host,
            port: config.port,
            auth: {
                user: config.username,
                pass: config.password,
            },
            // Connection timeout settings
            connectionTimeout: 60000, // 60 seconds - increased for slow connections
            greetingTimeout: 60000, // 60 seconds for greeting
            socketTimeout: 120000, // 120 seconds for socket
            // Debug mode for troubleshooting
            debug: process.env.NODE_ENV === 'development',
            logger: process.env.NODE_ENV === 'development',
        };

        if (isSSL) {
            // Port 465 - Implicit SSL (SMTPS)
            transportOptions.secure = true;
            transportOptions.tls = {
                rejectUnauthorized: false,
                servername: config.host, // Important for SNI
            };
        } else if (isTLS) {
            // Port 587 - STARTTLS
            transportOptions.secure = false;
            transportOptions.requireTLS = true;
            transportOptions.tls = {
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2',
                servername: config.host,
            };
        } else {
            // Plain connection (not recommended)
            transportOptions.secure = false;
        }

        return nodemailer.createTransport(transportOptions);
    }
}
