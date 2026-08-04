import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getClientSession } from '@/lib/server/client-auth';
import { ClientPortalShell } from '@/components/client/ClientPortalShell';

export const metadata: Metadata = {
    title: 'Espace client — ULS Transport',
    description: 'Suivi sécurisé de vos expéditions ULS Transport.',
    robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const session = await getClientSession();
    if (!session) redirect('/espace-client/login');

    return (
        <ClientPortalShell companyName={session.companyName} contactName={session.contactName}>
            {children}
        </ClientPortalShell>
    );
}
