import { prisma } from '@/lib/db';

/** The only two roles this CRM has. Anything else is rejected on write. */
export const STAFF_ROLES: string[] = ['ADMIN', 'MANAGER'];

/** Account lifecycle states recognised by the session resolver. */
export const STAFF_STATUSES: string[] = ['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'];

/**
 * True when `userId` is the only ADMIN who can still sign in.
 *
 * Deleting, demoting or suspending that account locks the whole team out of
 * /admin/users, /admin/logs and /admin/settings with no way back in short of
 * editing the database by hand.
 */
export async function isLastActiveAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, status: true },
    });

    if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') return false;

    const others = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE', id: { not: userId } },
    });

    return others === 0;
}
