import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';
import { requireSection, canDelete } from '@/lib/server/staff-auth';
import { EXPEDITION_STATUS_VALUES, SERVICE_SLUGS } from '@/lib/crm';
import { notifyExpedition } from '@/lib/server/expedition-notifications';

const SECTION = '/admin/expeditions';

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

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;
        const expedition = await prisma.expedition.findUnique({
            where: { id },
            include: {
                client: {
                    select: {
                        id: true, companyName: true, email: true, phone: true,
                        city: true, postalCode: true,
                    },
                },
                events: { orderBy: { createdAt: 'desc' } },
            },
        });

        if (!expedition) {
            return NextResponse.json({ error: 'Expédition introuvable.' }, { status: 404 });
        }

        return NextResponse.json({ expedition: present(expedition) });
    } catch (error) {
        console.error('Failed to fetch expedition:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;
    const { session } = guard;

    try {
        const { id } = await params;
        const body = await req.json();

        if (body.status && !EXPEDITION_STATUS_VALUES.includes(body.status)) {
            return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
        }
        if (body.service && !SERVICE_SLUGS.includes(body.service)) {
            return NextResponse.json({ error: 'Service ULS invalide.' }, { status: 400 });
        }

        const data: Prisma.ExpeditionUpdateInput & Record<string, unknown> = {};

        for (const key of [
            'status', 'service', 'pickupAddress', 'pickupPostalCode', 'pickupCity',
            'deliveryAddress', 'deliveryPostalCode', 'deliveryCity',
            'goodsDescription', 'temperature', 'vehicleType', 'notes',
        ]) {
            if (body[key] !== undefined) data[key] = body[key] || null;
        }

        if (body.pickupDate !== undefined) data.pickupDate = parseDate(body.pickupDate);
        if (body.deliveryDate !== undefined) data.deliveryDate = parseDate(body.deliveryDate);
        if (body.packages !== undefined) data.packages = parseNumber(body.packages);
        if (body.weightKg !== undefined) data.weightKg = parseNumber(body.weightKg);
        if (body.priceHt !== undefined) data.priceHt = parseNumber(body.priceHt);

        // Reassigning to another client is allowed, but it must exist.
        if (body.clientId !== undefined && body.clientId) {
            const client = await prisma.client.findUnique({ where: { id: body.clientId } });
            if (!client) {
                return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
            }
            data.clientId = body.clientId;
        }

        const previous = await prisma.expedition.findUnique({
            where: { id },
            select: { status: true },
        });
        if (!previous) {
            return NextResponse.json({ error: 'Expédition introuvable.' }, { status: 404 });
        }

        const statusChanged =
            data.status !== undefined && data.status !== previous.status;

        const actor = statusChanged
            ? await prisma.user.findUnique({
                where: { id: session.userId },
                select: { name: true, email: true },
            })
            : null;

        const expedition = await prisma.$transaction(async tx => {
            const updated = await tx.expedition.update({
                where: { id },
                data,
                include: { client: { select: { id: true, companyName: true } } },
            });

            // Append-only history: who moved the shipment, to what, and when.
            // Only status transitions are recorded — field edits stay in the
            // audit log, so the timeline reads as the shipment's life, not a
            // changelog.
            if (statusChanged) {
                await tx.expeditionEvent.create({
                    data: {
                        expeditionId: id,
                        type: 'status',
                        status: updated.status,
                        previousStatus: previous.status,
                        note: typeof body.statusNote === 'string' && body.statusNote.trim()
                            ? body.statusNote.trim()
                            : null,
                        userId: session.userId,
                        userName: actor?.name || actor?.email || null,
                    },
                });
            }

            return updated;
        });

        await logAction('Update Expedition', {
            id: expedition.id,
            reference: expedition.reference,
            status: expedition.status,
        });

        // Only a status transition is worth notifying about — a corrected
        // postcode is not news to the client. Never fatal: the shipment is
        // already saved.
        const notified = statusChanged
            ? await notifyExpedition({
                expeditionId: id,
                kind: 'status',
                previousStatus: previous.status,
            })
            : null;

        return NextResponse.json({ expedition: present(expedition), notified });
    } catch (error) {
        console.error('Failed to update expedition:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;

    if (!canDelete(guard.session)) {
        return NextResponse.json(
            { error: 'Seul un administrateur peut supprimer une expédition.' },
            { status: 403 }
        );
    }

    try {
        const { id } = await params;
        const expedition = await prisma.expedition.findUnique({ where: { id } });
        if (!expedition) {
            return NextResponse.json({ error: 'Expédition introuvable.' }, { status: 404 });
        }

        await prisma.expedition.delete({ where: { id } });
        await logAction('Delete Expedition', { id, reference: expedition.reference });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete expedition:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
