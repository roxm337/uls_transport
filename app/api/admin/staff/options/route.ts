import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSection } from '@/lib/server/staff-auth';

/**
 * Active staff accounts as `{ id, name }`, for the account-manager picker.
 *
 * Deliberately separate from `/api/admin/users`, which is ADMIN-only and
 * returns e-mails, statuses and permission sets: assigning an owner to a
 * client is ordinary CRM work that a MANAGER does, and it needs a name and
 * nothing else.
 */
export async function GET() {
    const guard = await requireSection(['/admin/clients', '/admin/expeditions']);
    if (!guard.ok) return guard.response;

    try {
        const staff = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                role: { in: ['ADMIN', 'MANAGER'] },
            },
            select: { id: true, name: true, email: true, role: true },
            orderBy: [{ name: 'asc' }, { email: 'asc' }],
        });

        return NextResponse.json({
            staff: staff.map(u => ({
                id: u.id,
                // Accounts are created without a name often enough that
                // falling back to the e-mail is the difference between a
                // usable picker and a list of blanks.
                name: u.name || u.email,
                role: u.role,
            })),
        });
    } catch (error) {
        console.error('Failed to fetch staff options:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
