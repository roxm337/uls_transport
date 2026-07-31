import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ULS Transport — Administration',
    description: 'Internal Management Dashboard',
    robots: {
        index: false,
        follow: false,
    },
};

import { LanguageProvider } from '@/lib/i18n/context';
import { AdminLayoutClient, type AdminAccount } from '@/components/admin/AdminLayoutClient';
import { getStaffSession } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';

/** Display name and avatar for the signed-in account. */
async function getStaffIdentity(
    userId: string,
    email: string | undefined
): Promise<AdminAccount> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, logo: true },
    });

    return {
        name: user?.name || user?.email || email || 'Compte',
        email: user?.email || email || '',
        logo: user?.logo ?? null,
    };
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Role and sections come from the same resolver the API guards use, so the
    // navigation can never offer a section the server would refuse.
    const session = await getStaffSession();
    const role = session?.role ?? 'MANAGER';
    const allowedSections = session?.sections ?? [];

    // The name is resolved here rather than fetched by the header: the
    // session is already loaded, and the identity should be on screen from
    // the first paint rather than after a round trip.
    const account = session
        ? await getStaffIdentity(session.userId, session.email)
        : null;

    return (
        <LanguageProvider>
            <AdminLayoutClient role={role} allowedSections={allowedSections} account={account}>
                {children}
            </AdminLayoutClient>
        </LanguageProvider>
    );
}
