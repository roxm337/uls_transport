import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';
import { requireSection } from '@/lib/server/staff-auth';
import { nextExpeditionReference } from '@/lib/server/expedition-reference';
import { notifyExpedition } from '@/lib/server/expedition-notifications';
import { EXPEDITION_STATUS_VALUES, SERVICE_SLUGS, EXPEDITION_ACTIVE } from '@/lib/crm';

const SECTION = '/admin/expeditions';

/** Page size cap, so a hand-crafted `pageSize` can't pull the whole table. */
const MAX_PAGE_SIZE = 100;

function parsePaging(searchParams: URLSearchParams) {
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const requested = Number(searchParams.get('pageSize')) || 25;
    const pageSize = Math.min(Math.max(1, requested), MAX_PAGE_SIZE);
    return { page, pageSize, skip: (page - 1) * pageSize };
}

/** Decimal/Date fields don't serialise cleanly — normalise before returning. */
function present<T extends { priceHt: unknown }>(expedition: T) {
    return {
        ...expedition,
        priceHt: expedition.priceHt === null ? null : Number(expedition.priceHt),
    };
}

function parseDate(value: unknown): Date | null {
    if (!value || typeof value !== 'string') return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;

    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search')?.trim();
        const status = searchParams.get('status');
        const service = searchParams.get('service');
        const clientId = searchParams.get('clientId');
        const { page, pageSize, skip } = parsePaging(searchParams);

        const and: Prisma.ExpeditionWhereInput[] = [];

        if (search) {
            and.push({
                OR: [
                    { reference: { contains: search } },
                    { goodsDescription: { contains: search } },
                    { pickupCity: { contains: search } },
                    { deliveryCity: { contains: search } },
                    { client: { companyName: { contains: search } } },
                ],
            });
        }

        if (status && status !== 'All') and.push({ status });
        if (service && service !== 'All') and.push({ service });
        if (clientId) and.push({ clientId });

        const where = and.length > 0 ? { AND: and } : {};

        // Counts run over the whole filtered set rather than the current page.
        // They were previously derived from the loaded rows, which silently
        // capped every summary card at the old 200-row ceiling.
        const [expeditions, total, activeCount, deliveredCount] = await Promise.all([
            prisma.expedition.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
                include: {
                    client: { select: { id: true, companyName: true } },
                },
            }),
            prisma.expedition.count({ where }),
            prisma.expedition.count({
                where: { AND: [...and, { status: { in: EXPEDITION_ACTIVE } }] },
            }),
            prisma.expedition.count({
                where: { AND: [...and, { status: 'Livree' }] },
            }),
        ]);

        return NextResponse.json({
            expeditions: expeditions.map(present),
            page,
            pageSize,
            total,
            pageCount: Math.max(1, Math.ceil(total / pageSize)),
            totals: {
                all: total,
                active: activeCount,
                delivered: deliveredCount,
            },
        });
    } catch (error) {
        console.error('Failed to fetch expeditions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;
    const { session } = guard;

    try {
        const body = await req.json();
        const { clientId, service, status } = body;

        if (!clientId) {
            return NextResponse.json({ error: 'Le client est obligatoire.' }, { status: 400 });
        }
        if (!service || !SERVICE_SLUGS.includes(service)) {
            return NextResponse.json({ error: 'Service ULS invalide.' }, { status: 400 });
        }
        if (status && !EXPEDITION_STATUS_VALUES.includes(status)) {
            return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
        }

        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
        }

        const year = new Date().getFullYear();

        const actor = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true, email: true },
        });
        const actorName = actor?.name || actor?.email || null;

        const expedition = await prisma.$transaction(async tx => {
            const reference = await nextExpeditionReference(tx, year);

            const created = await tx.expedition.create({
                data: {
                    reference,
                    clientId,
                    service,
                    status: status || 'Demandee',
                    pickupAddress: body.pickupAddress || null,
                    pickupPostalCode: body.pickupPostalCode || null,
                    pickupCity: body.pickupCity || null,
                    pickupDate: parseDate(body.pickupDate),
                    deliveryAddress: body.deliveryAddress || null,
                    deliveryPostalCode: body.deliveryPostalCode || null,
                    deliveryCity: body.deliveryCity || null,
                    deliveryDate: parseDate(body.deliveryDate),
                    goodsDescription: body.goodsDescription || null,
                    packages: parseNumber(body.packages),
                    weightKg: parseNumber(body.weightKg),
                    temperature: body.temperature || null,
                    vehicleType: body.vehicleType || null,
                    priceHt: parseNumber(body.priceHt),
                    notes: body.notes || null,
                },
                include: { client: { select: { id: true, companyName: true } } },
            });

            // Opening entry of the timeline: without it a shipment's history
            // would start at its first status change, not at its creation.
            await tx.expeditionEvent.create({
                data: {
                    expeditionId: created.id,
                    type: 'created',
                    status: created.status,
                    userId: session.userId,
                    userName: actorName,
                },
            });

            return created;
        });

        await logAction('Create Expedition', {
            id: expedition.id,
            reference: expedition.reference,
            client: client.companyName,
        });

        // Automatic notification, if the client's configuration asks for one.
        // Deliberately after the transaction and never fatal: a shipment is
        // saved whether or not the message goes out.
        const notified = await notifyExpedition({
            expeditionId: expedition.id,
            kind: 'created',
        });

        return NextResponse.json(
            { expedition: present(expedition), notified },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create expedition:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
