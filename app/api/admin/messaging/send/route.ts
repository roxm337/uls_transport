/**
 * Messaging Send API
 * Handles sending actual messages via the resolved configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { MessagingService } from '@/lib/services/messaging';
import { prisma } from '@/lib/db';
import { errorMessage } from '@/lib/errors';


export async function POST(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const body = await request.json();
        // `scopeId` used to name the client whose credentials to send with.
        // ULS sends with its own, so the only client that matters here is
        // the recipient, which the caller already resolved to an address.
        const { channel, recipient, subject, message, templateId } = body;

        if (!channel || !recipient || !message) {
            return NextResponse.json(
                { error: 'channel, recipient and message are required' },
                { status: 400 }
            );
        }

        const messagingService = new MessagingService();
        let result;

        if (channel === 'email') {
            if (!subject) {
                return NextResponse.json(
                    { error: 'subject is required for email' },
                    { status: 400 }
                );
            }
            result = await messagingService.sendEmail({
                to: recipient,
                subject,
                text: message,
                html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
            }, { templateId });
        } else if (channel === 'whatsapp') {
            result = await messagingService.sendWhatsApp({
                to: recipient,
                text: message,
                isFullMessage: true, // Manual sends are always full messages
            }, { templateId });
        } else {
            return NextResponse.json(
                { error: 'Invalid channel. Must be "email" or "whatsapp"' },
                { status: 400 }
            );
        }

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        // Update template usage stats if templateId provided and send was successful
        if (templateId && result.success) {
            try {
                await prisma.messageTemplate.update({
                    where: { id: templateId },
                    data: {
                        lastUsedAt: new Date(),
                        usageCount: { increment: 1 }
                    }
                });
                console.log('[Send API] Updated template usage stats for:', templateId);
            } catch (e) {
                console.error('[Send API] Failed to update template stats:', e);
                // Don't fail the request if template update fails
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('[API] POST /api/admin/messaging/send error:', error);
        return NextResponse.json(
            {
                success: false,
                error: errorMessage(error)
            },
            { status: 500 }
        );
    }
}
