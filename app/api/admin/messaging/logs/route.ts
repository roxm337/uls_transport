/**
 * Message Logs API
 * Retrieves message logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireSection } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';


/**
 * GET - Retrieve message logs
 */
export async function GET(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const { searchParams } = new URL(request.url);
        const channel = searchParams.get('channel'); // 'email' or 'whatsapp'
        const status = searchParams.get('status'); // 'sent', 'failed', 'pending'
        const recipient = searchParams.get('recipient'); // Filter by recipient
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Filtering by `scopeId` — the client whose configuration sent the
        // message — is gone with the per-client configurations. Every message
        // now leaves through the one ULS account, so the useful question is
        // who it went *to*: that is `recipient`.
        const where: Prisma.MessageLogWhereInput = {};

        if (channel) {
            where.channel = channel;
        }

        if (status) {
            where.status = status;
        }

        if (recipient) {
            where.recipient = {
                contains: recipient,
            };
        }

        // Get logs
        const [logs, total] = await Promise.all([
            prisma.messageLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    template: { select: { name: true, category: true } },
                },
            }),
            prisma.messageLog.count({ where }),
        ]);

        return NextResponse.json({
            logs,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error('[API] GET /api/admin/messaging/logs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
