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

/** A delivered shipment and the date it was actually delivered. */
interface Delivery {
    id: string;
    deliveredAt: Date;
    revenue: number;
}

/**
 * Every delivered shipment, each with the date it was delivered.
 *
 * The date is resolved from the best source available, in order:
 *
 *  1. the recorded transition to `Livree` — exact, and immutable once written;
 *  2. `deliveryDate`, the operational delivery date on the shipment;
 *  3. `updatedAt`, as a last resort.
 *
 * Only (1) is trustworthy, but it does not exist for every shipment. The
 * timeline was introduced after the fact, and its backfill wrote one
 * `created` event per existing shipment carrying the *current* status and
 * the *creation* date — so a legacy delivered shipment has a row saying
 * `Livree` that is dated the day it was booked, not the day it arrived.
 * Those rows are excluded here by requiring `type: 'status'`, and the
 * shipments behind them fall through to (2).
 *
 * The alternative — filtering solely on the event — silently dropped every
 * pre-timeline delivery out of the figures.
 */
async function loadDeliveries(): Promise<Delivery[]> {
    const [expeditions, events] = await Promise.all([
        prisma.expedition.findMany({
            where: { status: 'Livree' },
            select: { id: true, deliveryDate: true, updatedAt: true, priceHt: true },
        }),
        prisma.expeditionEvent.findMany({
            where: { type: 'status', status: 'Livree' },
            select: { expeditionId: true, createdAt: true },
            // Several transitions to Livree can exist if a shipment was
            // reopened; the most recent one is the delivery that stands.
            orderBy: { createdAt: 'desc' },
            distinct: ['expeditionId'],
        }),
    ]);

    const deliveredAtById = new Map(events.map(e => [e.expeditionId, e.createdAt]));

    return expeditions.map(e => ({
        id: e.id,
        deliveredAt: deliveredAtById.get(e.id) ?? e.deliveryDate ?? e.updatedAt,
        revenue: e.priceHt === null ? 0 : Number(e.priceHt),
    }));
}

/** The subset of `deliveries` that landed in `[from, to)`; `to` null = now. */
function deliveredBetween(deliveries: Delivery[], from: Date, to: Date | null): Delivery[] {
    return deliveries.filter(d =>
        d.deliveredAt >= from && (to === null || d.deliveredAt < to)
    );
}

function sumRevenue(deliveries: Delivery[]): number {
    return deliveries.reduce((total, d) => total + d.revenue, 0);
}

export async function GET() {
    // This endpoint backs both the dashboard and the analytics page, so
    // holding either section is enough.
    const guard = await requireSection(['/admin', '/admin/analytics']);
    if (!guard.ok) return guard.response;

    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Every delivery with the date it happened, resolved once and then
        // sliced per period. Deliveries used to be filtered on
        // `Expedition.updatedAt`, which every edit touches: correcting a
        // price on a shipment delivered in March moved it out of March's
        // figures and into the current month's.
        const deliveries = await loadDeliveries();
        const thisMonth = deliveredBetween(deliveries, startOfMonth, null);

        const [
            totalClients,
            activeClients,
            totalExpeditions,
            activeExpeditions,
            byStatus,
            byService,
        ] = await Promise.all([
            prisma.client.count(),
            prisma.client.count({ where: { status: 'Actif' } }),
            prisma.expedition.count(),
            prisma.expedition.count({ where: { status: { in: EXPEDITION_ACTIVE } } }),
            prisma.expedition.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            prisma.expedition.groupBy({
                by: ['service'],
                _count: { service: true },
            }),
        ]);

        const deliveredThisMonth = thisMonth.length;
        const revenueThisMonth = sumRevenue(thisMonth);

        // Expeditions opened and revenue delivered per month, last 6 months.
        //
        // Volume is keyed on creation and revenue on delivery: a shipment
        // booked in May and delivered in June counts once in May's bar and
        // once in June's revenue line, which is what each series means.
        const monthlyCounts = await Promise.all(
            Array.from({ length: 6 }, (_, index) => {
                const i = 5 - index;
                const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
                return prisma.expedition
                    .count({ where: { createdAt: { gte: from, lt: to } } })
                    .then(expeditions => ({
                        name: from.toLocaleDateString('fr-FR', { month: 'short' }),
                        expeditions,
                        revenue: sumRevenue(deliveredBetween(deliveries, from, to)),
                    }));
            })
        );
        const monthly = monthlyCounts;

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
                revenueThisMonth,
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
