/**
 * Message Logs API
 * Retrieves message logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
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
        const scopeId = searchParams.get('scopeId');
        const channel = searchParams.get('channel'); // 'email' or 'whatsapp'
        const status = searchParams.get('status'); // 'sent', 'failed', 'pending'
        const recipient = searchParams.get('recipient'); // Filter by recipient
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build where clause
        const where: any = {};

        if (scopeId) {
            // Find config for this scope
            const config = await prisma.messagingConfig.findFirst({
                where: { clientId: scopeId },
            });

            if (config) {
                where.configId = config.id;
            } else {
                // No config found, return empty results
                return NextResponse.json({
                    logs: [],
                    total: 0,
                });
            }
        }

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
                    config: {
                        select: {
                            clientId: true,
                        },
                    },
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
