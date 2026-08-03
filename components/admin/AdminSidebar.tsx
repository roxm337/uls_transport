'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    Truck,
    BarChart3,
    Settings,
    UserCog,
    LogOut,
    History,
    MessageCircle,
    Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/context';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { BRAND } from '@/lib/brand';
import { DEFAULT_MANAGER_SECTIONS } from '@/lib/sections';

interface AdminSidebarProps {
    role?: string;
    allowedSections?: string[] | null;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
}

function SidebarContent({ role, allowedSections, onItemClick }: { role?: string; allowedSections?: string[] | null; onItemClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: t.sidebar.dashboard, href: '/admin' },
        { icon: Building2, label: t.sidebar.clients, href: '/admin/clients' },
        { icon: Truck, label: t.sidebar.expeditions, href: '/admin/expeditions' },
        { icon: BarChart3, label: t.sidebar.analytics, href: '/admin/analytics' },
        { icon: UserCog, label: t.sidebar.team, href: '/admin/users' },
        { icon: MessageCircle, label: t.sidebar.messaging, href: '/admin/messaging' },
        { icon: History, label: t.sidebar.logs, href: '/admin/logs' },
        { icon: Settings, label: t.sidebar.settings, href: '/admin/settings' },
    ];

    // The layout resolves sections server-side (see lib/sections.ts), so this
    // is presentation only — the API enforces the same list independently.
    const filteredNavItems = navItems.filter(item =>
        role === 'ADMIN' || (allowedSections ?? DEFAULT_MANAGER_SECTIONS).includes(item.href)
    );

    return (
        <div className="route-grid flex h-full flex-col bg-ink-950 text-white">
            <div className="relative flex h-[4.5rem] items-center border-b border-white/10 px-5">
                <span className="absolute inset-y-0 left-0 w-1 bg-brand-500" />
                <div className="flex h-11 w-[7.5rem] items-center justify-center rounded-xl bg-brand-500 px-2 shadow-[0_8px_24px_rgba(253,231,24,.16)]">
                    <Image src={BRAND.logo} alt={BRAND.name} width={404} height={282} priority className="h-9 w-auto object-contain" />
                </div>
                <div className="ml-auto text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Console</p>
                    <p className="text-[11px] font-semibold text-white/75">Opérations</p>
                </div>
            </div>

            <div className="px-5 pb-2 pt-5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">
                Navigation
            </div>
            <nav className="flex-1 space-y-1 px-3 pb-4 overflow-y-auto">
                {filteredNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onItemClick}
                            className={cn(
                                "group relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                                isActive
                                    ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]"
                                    : "text-white/55 hover:bg-white/[0.045] hover:text-white"
                            )}
                        >
                            {isActive && (
                                <span className="absolute -left-0.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-brand-500 shadow-[0_0_12px_rgba(253,231,24,.45)]" />
                            )}
                            <span className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                isActive ? "bg-brand-500 text-ink-950" : "bg-white/[0.04] text-white/40 group-hover:text-white/75"
                            )}>
                                <item.icon className="h-4 w-4" />
                            </span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-white/10 p-3">
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/[0.035] px-3 py-2.5">
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
                        <Radio className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-ink-950 bg-emerald-400" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-white/75">Système opérationnel</p>
                        <p className="text-[9px] text-white/30">Services disponibles</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                    <LogOut className="h-5 w-5" />
                    {t.sidebar.logout}
                </button>
            </div>
        </div>
    );
}

export function AdminSidebar({ role, allowedSections, isMobileOpen, onMobileClose }: AdminSidebarProps) {
    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[17rem] border-r border-white/10 bg-ink-950 shadow-[10px_0_40px_rgba(10,10,10,.06)] lg:block">
                <SidebarContent role={role} allowedSections={allowedSections} />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileOpen} onOpenChange={onMobileClose}>
                <SheetContent side="left" className="w-[17rem] border-white/10 bg-ink-950 p-0">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <SidebarContent role={role} allowedSections={allowedSections} onItemClick={onMobileClose} />
                </SheetContent>
            </Sheet>
        </>
    );
}
