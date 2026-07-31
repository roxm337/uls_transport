/**
 * Messaging Configuration API
 *
 * One configuration for the whole company: ULS Transport's own SMTP account
 * and WhatsApp number, used to write to every client. It used to be scoped
 * per client — each row holding that client's credentials — which never
 * matched a transporter's reality.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection, requireAdmin } from '@/lib/server/staff-auth';
import { MessagingService } from '@/lib/services/messaging';
import { logAction } from '@/lib/actions';

/** Never hand a stored credential back to the browser. */
const MASK = '********';

/**
 * GET - the ULS messaging configuration.
 */
export async function GET() {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const config = await new MessagingService().getConfig();

        return NextResponse.json({
            ...config,
            smtpPassword: config.smtpPassword ? MASK : null,
            whatsappApiKey: config.whatsappApiKey ? MASK : null,
        });
    } catch (error) {
        console.error('[API] GET /api/admin/messaging/config error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST - write the ULS messaging configuration.
 */
export async function POST(request: NextRequest) {
    try {
        // Writing provider credentials stays ADMIN-only.
        const guard = await requireAdmin();
        if (!guard.ok) return guard.response;

        const body = await request.json();
        const configData = body.config ?? body;

        if (!configData || typeof configData !== 'object') {
            return NextResponse.json(
                { error: 'config is required' },
                { status: 400 }
            );
        }

        const {
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

        const messaging = new MessagingService();
        const existing = await messaging.getConfig();

        const data: Record<string, unknown> = {
            smtpEnabled: !!smtpEnabled,
            smtpHost: smtpHost || null,
            smtpPort: smtpPort ? parseInt(String(smtpPort), 10) : null,
            smtpUsername: smtpUsername || null,
            smtpEncryption: smtpEncryption || null,
            smtpFromName: smtpFromName || null,
            smtpFromEmail: smtpFromEmail || null,
            whatsappEnabled: !!whatsappEnabled,
            whatsappProvider: whatsappProvider || null,
            whatsappApiUrl: whatsappApiUrl || null,
            smtpAutoSend: !!smtpAutoSend,
            whatsappAutoSend: !!whatsappAutoSend,
            whatsappTimeout: whatsappTimeout ? parseInt(String(whatsappTimeout), 10) : 0,
            smtpTimeout: smtpTimeout ? parseInt(String(smtpTimeout), 10) : 0,
            whatsappTemplate: whatsappTemplate || null,
            staffNotifyEnabled: !!staffNotifyEnabled,
            staffNotifyPhone: staffNotifyPhone || null,
            staffNotifyGroupId: staffNotifyGroupId || null,
            staffNotifyMode: staffNotifyMode || 'phone',
        };

        // The screen receives credentials masked, so an unchanged field comes
        // back as the mask. Writing that through would replace the real
        // secret with eight asterisks.
        data.smtpPassword = !smtpPassword || smtpPassword === MASK
            ? existing.smtpPassword
            : smtpPassword;
        data.whatsappApiKey = !whatsappApiKey || whatsappApiKey === MASK
            ? existing.whatsappApiKey
            : whatsappApiKey;

        await messaging.updateConfig(data);
        const saved = await messaging.getConfig();

        // Credentials themselves are never logged — only that they changed.
        await logAction('Update Messaging Config', {
            smtpEnabled: data.smtpEnabled,
            whatsappEnabled: data.whatsappEnabled,
            smtpAutoSend: data.smtpAutoSend,
            whatsappAutoSend: data.whatsappAutoSend,
            staffNotifyEnabled: data.staffNotifyEnabled,
            smtpPasswordChanged: data.smtpPassword !== existing.smtpPassword,
            whatsappApiKeyChanged: data.whatsappApiKey !== existing.whatsappApiKey,
        });

        return NextResponse.json({
            success: true,
            config: {
                ...saved,
                smtpPassword: saved.smtpPassword ? MASK : null,
                whatsappApiKey: saved.whatsappApiKey ? MASK : null,
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
 * DELETE - clear the configuration back to empty.
 *
 * The row itself stays: it is a singleton the screen always needs, and
 * deleting it only to recreate it on the next read would hide the reset.
 */
export async function DELETE() {
    try {
        // Writing provider credentials stays ADMIN-only.
        const guard = await requireAdmin();
        if (!guard.ok) return guard.response;

        await new MessagingService().updateConfig({
            smtpEnabled: false,
            smtpHost: null,
            smtpPort: null,
            smtpUsername: null,
            smtpPassword: null,
            smtpEncryption: null,
            smtpFromName: null,
            smtpFromEmail: null,
            smtpAutoSend: false,
            smtpTimeout: 0,
            whatsappEnabled: false,
            whatsappProvider: null,
            whatsappApiKey: null,
            whatsappApiUrl: null,
            whatsappAutoSend: false,
            whatsappTimeout: 0,
            whatsappTemplate: null,
            staffNotifyEnabled: false,
            staffNotifyPhone: null,
            staffNotifyGroupId: null,
            staffNotifyMode: 'phone',
        });

        await logAction('Reset Messaging Config', {});

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] DELETE /api/admin/messaging/config error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
