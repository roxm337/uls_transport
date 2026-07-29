import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSection } from '@/lib/server/staff-auth';

/**
 * Every client as `{ id, companyName }`, for pickers.
 *
 * The list endpoint is paged, so a `<Select>` fed from it would only ever
 * offer the first page. This projection stays unpaged on purpose: two columns
 * over a few thousand rows is cheap, where the full list endpoint is not.
 */
export async function GET() {
    // Anyone who can create an expedition needs to pick a client for it.
    const guard = await requireSection(['/admin/clients', '/admin/expeditions']);
    if (!guard.ok) return guard.response;

    try {
        const clients = await prisma.client.findMany({
            select: { id: true, companyName: true },
            orderBy: { companyName: 'asc' },
        });

        return NextResponse.json({ clients });
    } catch (error) {
        console.error('Failed to fetch client options:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
