import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSection } from '@/lib/server/staff-auth';

/**
 * Client companies, used by the messaging screens to scope a configuration
 * or pick recipients.
 *
 * Note: the middleware matcher is `/admin/:path*`, which does NOT cover
 * `/api/admin/*`. API routes must therefore check the session themselves.
 */
export async function GET() {
    const guard = await requireSection(['/admin/messaging', '/admin/clients']);
    if (!guard.ok) return guard.response;

    try {
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                companyName: true,
                email: true,
            },
            orderBy: { companyName: 'asc' },
        });

        // Keep the `name` key the messaging components already expect.
        return NextResponse.json({
            clients: clients.map(c => ({
                id: c.id,
                name: c.companyName,
                email: c.email,
            })),
        });
    } catch (error) {
        console.error('Failed to fetch clients:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
