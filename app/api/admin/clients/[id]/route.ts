import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';
import { requireSection, canDelete } from '@/lib/server/staff-auth';
import { CLIENT_STATUSES, SERVICE_SLUGS } from '@/lib/crm';

function serialiseServices(input: unknown): string | null {
    if (!Array.isArray(input)) return null;
    const clean = input.filter(s => typeof s === 'string' && SERVICE_SLUGS.includes(s));
    return clean.length > 0 ? JSON.stringify(clean) : null;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection('/admin/clients');
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;

        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
                expeditions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        });

        if (!client) {
            return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
        }

        return NextResponse.json({
            client: {
                ...client,
                // Decimal does not survive JSON cleanly — hand back plain numbers.
                expeditions: client.expeditions.map(e => ({
                    ...e,
                    priceHt: e.priceHt === null ? null : Number(e.priceHt),
                })),
            },
        });
    } catch (error) {
        console.error('Failed to fetch client:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection('/admin/clients');
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;
        const body = await req.json();

        if (body.status && !CLIENT_STATUSES.includes(body.status)) {
            return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
        }

        if (body.companyName !== undefined && !String(body.companyName).trim()) {
            return NextResponse.json(
                { error: 'La raison sociale est obligatoire.' },
                { status: 400 }
            );
        }

        const data: any = {};
        const passthrough = [
            'siret', 'vatNumber', 'contactName', 'email', 'phone',
            'addressLine', 'postalCode', 'city', 'country',
            'status', 'accountManagerId', 'paymentTerms', 'notes',
        ];

        for (const key of passthrough) {
            if (body[key] !== undefined) data[key] = body[key] || null;
        }

        if (body.companyName !== undefined) data.companyName = String(body.companyName).trim();
        if (body.services !== undefined) data.services = serialiseServices(body.services);
        // country has a NOT NULL default; never write null into it
        if (data.country === null) data.country = 'France';

        const client = await prisma.client.update({ where: { id }, data });

        await logAction('Update Client', { id: client.id, companyName: client.companyName });

        return NextResponse.json({ client });
    } catch (error) {
        console.error('Failed to update client:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection('/admin/clients');
    if (!guard.ok) return guard.response;

    if (!canDelete(guard.session)) {
        return NextResponse.json(
            { error: 'Seul un administrateur peut supprimer un client.' },
            { status: 403 }
        );
    }

    try {
        const { id } = await params;

        const client = await prisma.client.findUnique({
            where: { id },
            include: { _count: { select: { expeditions: true } } },
        });

        if (!client) {
            return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
        }

        // Deleting cascades to contacts and expeditions — make that explicit
        // rather than letting staff discover it after the fact.
        await prisma.client.delete({ where: { id } });

        await logAction('Delete Client', {
            id,
            companyName: client.companyName,
            expeditionsRemoved: client._count.expeditions,
        });

        return NextResponse.json({
            success: true,
            expeditionsRemoved: client._count.expeditions,
        });
    } catch (error) {
        console.error('Failed to delete client:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
