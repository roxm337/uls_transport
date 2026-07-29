/**
 * Messaging Configuration API
 * Manages email and WhatsApp configurations per client
 * Client config applies to all their landing pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection, requireAdmin } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { encryptCredential, decryptCredential } from '@/lib/services/messaging';


/**
 * GET - Retrieve messaging configuration for a client
 * Client config applies to all their landing pages
 */
export async function GET(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId') || searchParams.get('scopeId');

        if (!clientId) {
            return NextResponse.json(
                { error: 'clientId is required' },
                { status: 400 }
            );
        }

        // Find configuration for this client
        const config = await prisma.messagingConfig.findFirst({
            where: { clientId },
        });

        if (!config) {
            // Return empty config instead of 404 to allow creating new one easily
            return NextResponse.json({
                clientMessagingEnabled: false,
                smtpEnabled: false,
                whatsappEnabled: false,
                // ... defaults
            });
        }

        // Decrypt sensitive fields for display (but mask them partially)
        const response = {
            ...config,
            smtpPassword: config.smtpPassword ? '********' : null,
            whatsappApiKey: config.whatsappApiKey ? '********' : null,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('[API] GET /api/admin/messaging/config error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST - Create or update messaging configuration for a client
 * Client config applies to all their landing pages
 */
export async function POST(request: NextRequest) {
    try {
        // Writing provider credentials stays ADMIN-only.
        const guard = await requireAdmin();
        if (!guard.ok) return guard.response;

        const body = await request.json();
        const {
            clientId,
            // scopeId, // Removed: strictly use clientId
            config: configData, // The settings object
        } = body;

        if (!clientId || !configData) {
            return NextResponse.json(
                { error: 'clientId and config are required' },
                { status: 400 }
            );
        }

        const {
            clientMessagingEnabled,
            smtpEnabled,
            smtpHost,
            smtpPort,
            smtpUsername,
            smtpPassword,
            smtpEncryption,
            smtpFromName,
            smtpFromEmail,
            whatsappEnabled,
            whatsappProvider,
            whatsappApiKey,
            whatsappApiUrl,
            smtpAutoSend,
            whatsappAutoSend,
            whatsappTimeout,
            whatsappTemplate,
            smtpTimeout,
            // Staff notification fields
            staffNotifyEnabled,
            staffNotifyPhone,
            staffNotifyGroupId,
            staffNotifyMode,
        } = configData;

        // Prepare data with encryption
        const data: any = {
            type: 'client', // Enforce type
            clientMessagingEnabled: !!clientMessagingEnabled,
            smtpEnabled: smtpEnabled || false,
            smtpHost,
            smtpPort: smtpPort ? parseInt(smtpPort) : null,
            smtpUsername,
            smtpPassword: smtpPassword ? encryptCredential(smtpPassword) : null,
            smtpEncryption,
            smtpFromName,
            smtpFromEmail,
            whatsappEnabled: whatsappEnabled || false,
            whatsappProvider,
            whatsappApiKey: whatsappApiKey ? encryptCredential(whatsappApiKey) : null,
            whatsappApiUrl,
            smtpAutoSend: smtpAutoSend || false,
            whatsappAutoSend: whatsappAutoSend || false,
            whatsappTimeout: whatsappTimeout ? parseInt(whatsappTimeout) : 0,
            smtpTimeout: smtpTimeout ? parseInt(smtpTimeout) : 0,
            whatsappTemplate: whatsappTemplate || null,
            // Staff notification
            staffNotifyEnabled: staffNotifyEnabled || false,
            staffNotifyPhone: staffNotifyPhone || null,
            staffNotifyGroupId: staffNotifyGroupId || null,
            staffNotifyMode: staffNotifyMode || 'phone',
        };

        // Check if config exists for this client
        const existing = await prisma.messagingConfig.findFirst({
            where: { clientId },
        });

        let savedConfig;
        if (existing) {
            // Update existing config
            // Only update password/apiKey if new values are provided
            if (!smtpPassword || smtpPassword === '********') {
                delete data.smtpPassword;
            }
            if (!whatsappApiKey || whatsappApiKey === '********') {
                delete data.whatsappApiKey;
            }

            savedConfig = await prisma.messagingConfig.update({
                where: { id: existing.id },
                data,
            });
        } else {
            // Create new config for client
            savedConfig = await prisma.messagingConfig.create({
                data: {
                    ...data,
                    clientId,
                },
            });
        }

        return NextResponse.json({
            success: true,
            config: {
                ...savedConfig,
                smtpPassword: savedConfig.smtpPassword ? '********' : null,
                whatsappApiKey: savedConfig.whatsappApiKey ? '********' : null,
            },
        });
    } catch (error) {
        console.error('[API] POST /api/admin/messaging/config error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Remove messaging configuration for a client
 */
export async function DELETE(request: NextRequest) {
    try {
        // Writing provider credentials stays ADMIN-only.
        const guard = await requireAdmin();
        if (!guard.ok) return guard.response;

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json(
                { error: 'clientId is required' },
                { status: 400 }
            );
        }

        // Find and delete configuration for this client
        const config = await prisma.messagingConfig.findFirst({
            where: { clientId },
        });

        if (!config) {
            return NextResponse.json(
                { error: 'Configuration not found' },
                { status: 404 }
            );
        }

        await prisma.messagingConfig.delete({
            where: { id: config.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] DELETE /api/admin/messaging/config error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
