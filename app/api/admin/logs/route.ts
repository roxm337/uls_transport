import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/server/staff-auth';

/**
 * Audit trail (ActionLog). Previously lived under /api/admin/analytics/logs,
 * which conflated it with the removed web-traffic analytics.
 */
export async function GET(req: Request) {
    // The audit trail names who did what from where — ADMIN only, matching
    // the middleware guard on /admin/logs.
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
        const offset = Number(searchParams.get('offset')) || 0;

        const [logs, total] = await Promise.all([
            prisma.actionLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
            }),
            prisma.actionLog.count(),
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                total,
                limit,
                offset,
                pages: Math.ceil(total / limit),
                currentPage: Math.floor(offset / limit) + 1,
            },
        });
    } catch (error) {
        console.error('Failed to fetch logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE() {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    try {
        const { count } = await prisma.actionLog.deleteMany({});
        return NextResponse.json({ success: true, deleted: count });
    } catch (error) {
        console.error('Failed to clear logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
