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
        const search = searchParams.get('search')?.trim();
        const requestedLimit = Number.parseInt(searchParams.get('limit') || '10', 10);
        const requestedOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
        const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 10, 1), 100);
        const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

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

        if (search) {
            where.OR = [
                { recipient: { contains: search } },
                { subject: { contains: search } },
                { message: { contains: search } },
            ];
        }

        // All totals use the same filters and search as the table; pagination
        // changes only the visible rows, never the meaning of the cards.
        const [logs, total, sent, failed, email, whatsapp] = await Promise.all([
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
            prisma.messageLog.count({ where: { AND: [where, { status: 'sent' }] } }),
            prisma.messageLog.count({ where: { AND: [where, { status: 'failed' }] } }),
            prisma.messageLog.count({ where: { AND: [where, { channel: 'email' }] } }),
            prisma.messageLog.count({ where: { AND: [where, { channel: 'whatsapp' }] } }),
        ]);

        return NextResponse.json({
            logs,
            total,
            limit,
            offset,
            stats: { total, sent, failed, email, whatsapp },
        });
    } catch (error) {
        console.error('[API] GET /api/admin/messaging/logs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
