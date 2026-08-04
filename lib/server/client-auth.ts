import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const CLIENT_COOKIE = 'client-auth-token';

export interface ClientSession {
    accountId: string;
    clientId: string;
    email: string;
    companyName: string;
    contactName: string | null;
}

/**
 * Resolve portal access against the database on every request. Disabling an
 * account therefore revokes an existing cookie immediately rather than when
 * its JWT expires.
 */
export async function getClientSession(): Promise<ClientSession | null> {
    const token = (await cookies()).get(CLIENT_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'CLIENT') return null;

    const accountId = payload.userId as string | undefined;
    if (!accountId) return null;

    const account = await prisma.clientPortalAccount.findUnique({
        where: { id: accountId },
        include: {
            client: {
                select: {
                    id: true,
                    companyName: true,
                    contactName: true,
                    status: true,
                },
            },
        },
    });

    if (!account?.enabled || account.client.status === 'Suspendu') return null;

    return {
        accountId: account.id,
        clientId: account.client.id,
        email: account.email,
        companyName: account.client.companyName,
        contactName: account.client.contactName,
    };
}
