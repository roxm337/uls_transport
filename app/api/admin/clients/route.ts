import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';
import { requireSection } from '@/lib/server/staff-auth';
import { CLIENT_STATUSES, SERVICE_SLUGS } from '@/lib/crm';

const SECTION = '/admin/clients';

/** Page size cap, so a hand-crafted `pageSize` can't pull the whole table. */
const MAX_PAGE_SIZE = 100;

function parsePaging(searchParams: URLSearchParams) {
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const requested = Number(searchParams.get('pageSize')) || 25;
    const pageSize = Math.min(Math.max(1, requested), MAX_PAGE_SIZE);
    return { page, pageSize, skip: (page - 1) * pageSize };
}

/** Keep only known service slugs, stored as a JSON array. */
function serialiseServices(input: unknown): string | null {
    if (!Array.isArray(input)) return null;
    const clean = input.filter(s => typeof s === 'string' && SERVICE_SLUGS.includes(s));
    return clean.length > 0 ? JSON.stringify(clean) : null;
}

export async function GET(req: Request) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;

    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search')?.trim();
        const status = searchParams.get('status');
        const service = searchParams.get('service');
        const { page, pageSize, skip } = parsePaging(searchParams);

        const and: any[] = [];

        if (search) {
            and.push({
                OR: [
                    { companyName: { contains: search } },
                    { contactName: { contains: search } },
                    { email: { contains: search } },
                    { city: { contains: search } },
                    { siret: { contains: search } },
                ],
            });
        }

        if (status && status !== 'All') and.push({ status });
        // services is a JSON string column; a substring match on the slug is
        // enough to filter and avoids a JSON function that MySQL 5.7 may lack.
        if (service && service !== 'All') and.push({ services: { contains: service } });

        const where = and.length > 0 ? { AND: and } : {};

        // Totals are computed over the whole filtered set, not the current
        // page, so the summary cards stay correct once paging kicks in.
        const [clients, total, activeCount, expeditionCount] = await Promise.all([
            prisma.client.findMany({
                where,
                orderBy: { companyName: 'asc' },
                skip,
                take: pageSize,
                include: {
                    _count: { select: { expeditions: true, contacts: true } },
                },
            }),
            prisma.client.count({ where }),
            prisma.client.count({ where: { AND: [...and, { status: 'Actif' }] } }),
            prisma.expedition.count({ where: { client: where } }),
        ]);

        return NextResponse.json({
            clients,
            page,
            pageSize,
            total,
            pageCount: Math.max(1, Math.ceil(total / pageSize)),
            totals: {
                all: total,
                actifs: activeCount,
                expeditions: expeditionCount,
            },
        });
    } catch (error) {
        console.error('Failed to fetch clients:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;

    try {
        const body = await req.json();
        const { companyName, status } = body;

        if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
            return NextResponse.json(
                { error: 'La raison sociale est obligatoire.' },
                { status: 400 }
            );
        }

        if (status && !CLIENT_STATUSES.includes(status)) {
            return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
        }

        const client = await prisma.client.create({
            data: {
                companyName: companyName.trim(),
                siret: body.siret || null,
                vatNumber: body.vatNumber || null,
                contactName: body.contactName || null,
                email: body.email || null,
                phone: body.phone || null,
                addressLine: body.addressLine || null,
                postalCode: body.postalCode || null,
                city: body.city || null,
                country: body.country || 'France',
                status: status || 'Prospect',
                services: serialiseServices(body.services),
                accountManagerId: body.accountManagerId || null,
                paymentTerms: body.paymentTerms || null,
                notes: body.notes || null,
            },
        });

        await logAction('Create Client', { id: client.id, companyName: client.companyName });

        return NextResponse.json({ client }, { status: 201 });
    } catch (error) {
        console.error('Failed to create client:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
