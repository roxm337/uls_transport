'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldOff } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { sectionForPath } from '@/lib/sections';
import { useLanguage } from '@/lib/i18n/context';

/** Who is signed in, as shown by the header account menu. */
export interface AdminAccount {
    name: string;
    email: string;
    logo: string | null;
}

interface AdminContextType {
    role: string;
    allowedSections: string[] | null;
    account: AdminAccount | null;
}

const AdminContext = createContext<AdminContextType>({
    role: 'MANAGER',
    allowedSections: null,
    account: null,
});

export function useAdminRole() {
    return useContext(AdminContext).role;
}

export function useAdminContext() {
    return useContext(AdminContext);
}

export function AdminLayoutClient({
    children,
    role,
    allowedSections,
    account = null,
}: {
    children: React.ReactNode;
    role: string;
    allowedSections: string[] | null;
    account?: AdminAccount | null;
}) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Presentation guard: keeps a typed-in URL from rendering a screen whose
    // data the API will refuse anyway. The API remains the real boundary.
    const section = sectionForPath(pathname ?? '');
    const denied =
        role !== 'ADMIN' &&
        section !== null &&
        allowedSections !== null &&
        !allowedSections.includes(section);

    if (!mounted) {
        return (
            <div className="admin-shell flex min-h-screen font-sans invisible">
                <div className="min-w-0 flex-1 md:ml-[17rem] transition-all duration-300 ease-in-out">
                    <main className="admin-main">
                        {children}
                    </main>
                </div>
            </div>
        );
    }

    return (
        <AdminContext.Provider value={{ role, allowedSections, account }}>
            <div className="admin-shell flex min-h-screen font-sans">
                <AdminSidebar
                    role={role}
                    allowedSections={allowedSections}
                    isMobileOpen={isMobileSidebarOpen}
                    onMobileClose={() => setIsMobileSidebarOpen(false)}
                />

                {/* Main Content */}
                <div className="min-w-0 flex-1 md:ml-[17rem] transition-all duration-300 ease-in-out">
                    <AdminHeader
                        onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
                        account={account}
                        role={role}
                    />

                    <main className="admin-main">
                        {denied ? <SectionDenied section={section} /> : children}
                    </main>
                </div>
            </div>
        </AdminContext.Provider>
    );
}

/** Section path → the sidebar label for it, so both read the same word. */
const SECTION_LABEL_KEYS: Record<string, keyof ReturnType<typeof useLanguage>['t']['sidebar']> = {
    '/admin': 'dashboard',
    '/admin/clients': 'clients',
    '/admin/expeditions': 'expeditions',
    '/admin/analytics': 'analytics',
    '/admin/messaging': 'messaging',
    '/admin/users': 'team',
    '/admin/logs': 'logs',
    '/admin/settings': 'settings',
};

function SectionDenied({ section }: { section: string | null }) {
    const { t } = useLanguage();
    const key = section ? SECTION_LABEL_KEYS[section] : undefined;
    const label = key ? t.sidebar[key] : section;

    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md text-center">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ink-950">
                    <ShieldOff className="h-6 w-6 text-brand-500" />
                </span>
                <h1 className="text-xl font-black tracking-tight text-ink-950">
                    {t.denied.title}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    {label ? t.denied.named(label) : t.denied.generic}{' '}
                    {t.denied.contact}
                </p>
                <Link
                    href="/admin"
                    className="mt-5 inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-ink-950 transition-colors hover:bg-brand-400"
                >
                    {t.denied.back}
                </Link>
            </div>
        </div>
    );
}
