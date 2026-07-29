import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSection } from '@/lib/server/staff-auth';
import {
    EXPEDITION_ACTIVE,
    EXPEDITION_STATUSES,
    expeditionStatusLabel,
    serviceShortLabel,
    SERVICE_SLUGS,
} from '@/lib/crm';

/** Colour per expedition status, matching the badge palette. */
const STATUS_COLORS: Record<string, string> = {
    Demandee: '#8a8a8a',
    Planifiee: '#0ea5e9',
    Enlevee: '#f59e0b',
    'En transit': '#fde718',
    Livree: '#10b981',
    Annulee: '#ef4444',
};

export async function GET() {
    // This endpoint backs both the dashboard and the analytics page, so
    // holding either section is enough.
    const guard = await requireSection(['/admin', '/admin/analytics']);
    if (!guard.ok) return guard.response;

    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalClients,
            activeClients,
            totalExpeditions,
            activeExpeditions,
            deliveredThisMonth,
            byStatus,
            byService,
            revenueAgg,
        ] = await Promise.all([
            prisma.client.count(),
            prisma.client.count({ where: { status: 'Actif' } }),
            prisma.expedition.count(),
            prisma.expedition.count({ where: { status: { in: EXPEDITION_ACTIVE } } }),
            prisma.expedition.count({
                where: { status: 'Livree', updatedAt: { gte: startOfMonth } },
            }),
            prisma.expedition.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            prisma.expedition.groupBy({
                by: ['service'],
                _count: { service: true },
            }),
            prisma.expedition.aggregate({
                _sum: { priceHt: true },
                where: { status: 'Livree', updatedAt: { gte: startOfMonth } },
            }),
        ]);

        // Expeditions and delivered revenue per month over the last 6 months.
        const monthly: { name: string; expeditions: number; revenue: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const [count, revenue] = await Promise.all([
                prisma.expedition.count({ where: { createdAt: { gte: from, lt: to } } }),
                prisma.expedition.aggregate({
                    _sum: { priceHt: true },
                    where: { status: 'Livree', createdAt: { gte: from, lt: to } },
                }),
            ]);
            monthly.push({
                name: from.toLocaleDateString('fr-FR', { month: 'short' }),
                expeditions: count,
                revenue: revenue._sum.priceHt ? Number(revenue._sum.priceHt) : 0,
            });
        }

        // Highest-volume clients.
        const topClientsRaw = await prisma.expedition.groupBy({
            by: ['clientId'],
            _count: { clientId: true },
            _sum: { priceHt: true },
            orderBy: { _count: { clientId: 'desc' } },
            take: 6,
        });
        const topClientNames = await prisma.client.findMany({
            where: { id: { in: topClientsRaw.map(c => c.clientId) } },
            select: { id: true, companyName: true },
        });
        const nameById = new Map(topClientNames.map(c => [c.id, c.companyName]));
        const topClients = topClientsRaw.map(c => ({
            id: c.clientId,
            name: nameById.get(c.clientId) ?? '—',
            expeditions: c._count.clientId,
            revenue: c._sum.priceHt ? Number(c._sum.priceHt) : 0,
        }));

        const statusMap = new Map(byStatus.map(s => [s.status, s._count.status]));
        const statusData = EXPEDITION_STATUSES
            .map(s => ({
                name: s.label,
                value: statusMap.get(s.value) ?? 0,
                color: STATUS_COLORS[s.value] ?? '#8a8a8a',
            }))
            .filter(s => s.value > 0);

        const serviceMap = new Map(byService.map(s => [s.service, s._count.service]));
        const serviceData = SERVICE_SLUGS
            .map(slug => ({
                name: serviceShortLabel(slug),
                value: serviceMap.get(slug) ?? 0,
            }))
            .filter(s => s.value > 0)
            .sort((a, b) => b.value - a.value);

        return NextResponse.json({
            kpis: {
                totalClients,
                activeClients,
                totalExpeditions,
                activeExpeditions,
                deliveredThisMonth,
                revenueThisMonth: revenueAgg._sum.priceHt
                    ? Number(revenueAgg._sum.priceHt)
                    : 0,
            },
            charts: {
                monthly,
                byStatus: statusData,
                byService: serviceData,
                topClients,
            },
            recentExpeditions: (
                await prisma.expedition.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: 8,
                    include: { client: { select: { companyName: true } } },
                })
            ).map(e => ({
                id: e.id,
                reference: e.reference,
                client: e.client.companyName,
                service: serviceShortLabel(e.service),
                status: e.status,
                statusLabel: expeditionStatusLabel(e.status),
                createdAt: e.createdAt,
            })),
        });
    } catch (error) {
        console.error('Failed to build analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
