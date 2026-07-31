import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
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
        const search = searchParams.get('search')?.trim();
        const role = searchParams.get('role');
        const action = searchParams.get('action');

        // Filtering happens here rather than in the browser. Client-side it
        // only ever saw the 50 rows of the current page, so "rechercher par
        // utilisateur, action, IP" searched a single page while presenting
        // itself — result count and all — as a search of the whole trail.
        const and: Prisma.ActionLogWhereInput[] = [];

        if (search) {
            and.push({
                OR: [
                    { action: { contains: search } },
                    { ipAddress: { contains: search } },
                    { userAgent: { contains: search } },
                    { details: { contains: search } },
                    { user: { name: { contains: search } } },
                    { user: { email: { contains: search } } },
                ],
            });
        }

        // SYSTEM covers entries with no author: unauthenticated events, and
        // rows whose author has since been deleted.
        if (role === 'SYSTEM') and.push({ userId: null });
        else if (role && role !== 'all') and.push({ user: { role } });

        if (action && action !== 'all') and.push({ action });

        const where = and.length > 0 ? { AND: and } : {};

        const [logs, total, actions] = await Promise.all([
            prisma.actionLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
            }),
            prisma.actionLog.count({ where }),
            // The action filter must offer every action ever recorded, not
            // just those that happen to appear on the page being viewed.
            prisma.actionLog.findMany({
                distinct: ['action'],
                select: { action: true },
                orderBy: { action: 'asc' },
            }),
        ]);

        return NextResponse.json({
            logs,
            actions: actions.map(a => a.action),
            pagination: {
                total,
                limit,
                offset,
                pages: Math.max(1, Math.ceil(total / limit)),
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
