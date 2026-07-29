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
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient';
import { getStaffSession } from '@/lib/server/staff-auth';

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

    return (
        <LanguageProvider>
            <AdminLayoutClient role={role} allowedSections={allowedSections}>
                {children}
            </AdminLayoutClient>
        </LanguageProvider>
    );
}
