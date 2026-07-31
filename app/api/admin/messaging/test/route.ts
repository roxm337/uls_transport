/**
 * Messaging Test API
 * Tests email and WhatsApp configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { MessagingService, EmailService } from '@/lib/services/messaging';
import { getWhatsAppProvider } from '@/lib/services/messaging';

/** Placeholder the configuration screen shows in place of a stored secret. */
const MASK = '********';

/**
 * POST - Test a messaging configuration
 */
export async function POST(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const body = await request.json();
        const { type, config, testRecipient } = body;

        if (!type || !config) {
            return NextResponse.json(
                { error: 'type and config are required' },
                { status: 400 }
            );
        }

        // The screen holds credentials masked, so testing a saved
        // configuration without retyping the password sent '********' to the
        // SMTP server and reported the account as broken. Swap the mask back
        // for what is stored; a freshly typed value is used as given.
        const stored = await new MessagingService().getConfig();
        if (!config.smtpPassword || config.smtpPassword === MASK) {
            config.smtpPassword = stored.smtpPassword;
        }
        if (!config.whatsappApiKey || config.whatsappApiKey === MASK) {
            config.whatsappApiKey = stored.whatsappApiKey;
        }

        if (type === 'email') {
            // Test email configuration
            const emailService = new EmailService();

            // First validate the config
            const isValid = await emailService.validateConfig({
                id: 'test',
                host: config.smtpHost,
                port: parseInt(config.smtpPort),
                username: config.smtpUsername,
                password: config.smtpPassword,
                encryption: config.smtpEncryption,
                fromName: config.smtpFromName,
                fromEmail: config.smtpFromEmail,
                autoSend: true, // Manual tests are always allowed
            });

            if (!isValid) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid SMTP configuration. Please check your credentials.',
                });
            }

            // If test recipient is provided, send a test email
            if (testRecipient) {
                const result = await emailService.send(
                    {
                        to: testRecipient,
                        subject: 'Test Email from ULS Transport Messaging Service',
                        text: 'This is a test email to verify your SMTP configuration.',
                        html: '<p>This is a test email to verify your SMTP configuration.</p>',
                    },
                    {
                        id: 'test',
                        host: config.smtpHost,
                        port: parseInt(config.smtpPort),
                        username: config.smtpUsername,
                        password: config.smtpPassword,
                        encryption: config.smtpEncryption,
                        fromName: config.smtpFromName,
                        fromEmail: config.smtpFromEmail,
                        autoSend: true,
                    }
                );

                return NextResponse.json(result);
            }

            return NextResponse.json({
                success: true,
                message: 'SMTP configuration is valid',
            });
        } else if (type === 'whatsapp') {
            // Test WhatsApp configuration
            const provider = getWhatsAppProvider(config.whatsappProvider || 'wasender');

            if (!provider) {
                return NextResponse.json({
                    success: false,
                    error: `Unknown provider: ${config.whatsappProvider}`,
                });
            }

            // Validate config
            const isValid = await provider.validateConfig({
                id: 'test',
                provider: config.whatsappProvider || 'wasender',
                apiKey: config.whatsappApiKey,
                apiUrl: config.whatsappApiUrl || 'https://www.wasenderapi.com/api/send-message',
                autoSend: true,
                timeout: 0,
            });

            if (!isValid) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid WhatsApp configuration. Please check your API key.',
                });
            }

            // If test recipient is provided, send a test message
            if (testRecipient) {
                const result = await provider.send(
                    {
                        to: testRecipient,
                        text: 'This is a test message from the ULS Transport messaging service.',
                    },
                    {
                        id: 'test',
                        provider: config.whatsappProvider || 'wasender',
                        apiKey: config.whatsappApiKey,
                        apiUrl: config.whatsappApiUrl || 'https://www.wasenderapi.com/api/send-message',
                        autoSend: true,
                        timeout: 0,
                    }
                );

                return NextResponse.json(result);
            }

            return NextResponse.json({
                success: true,
                message: 'WhatsApp configuration is valid',
            });
        } else {
            return NextResponse.json(
                { error: 'Invalid type. Must be "email" or "whatsapp"' },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error('[API] POST /api/admin/messaging/test error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Internal server error'
            },
            { status: 500 }
        );
    }
}
