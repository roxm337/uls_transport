'use client';

import { useState } from 'react';
import Link from 'next/link';
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
        { icon: History, label: 'Logs', href: '/admin/logs' },
        { icon: Settings, label: t.sidebar.settings, href: '/admin/settings' },
    ];

    // The layout resolves sections server-side (see lib/sections.ts), so this
    // is presentation only — the API enforces the same list independently.
    const filteredNavItems = navItems.filter(item =>
        role === 'ADMIN' || (allowedSections ?? DEFAULT_MANAGER_SECTIONS).includes(item.href)
    );

    return (
        <div className="flex h-full flex-col bg-ink-950">
            {/* Yellow band: the ULS mark is drawn for light grounds, and brand
                yellow is the one light ground that stays on-brand. */}
            <div className="flex h-16 items-center bg-brand-500 px-6">
                <img src={BRAND.logo} alt={BRAND.name} className="h-10 w-auto" />
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {filteredNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onItemClick}
                            className={cn(
                                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-white/[0.07] text-brand-500"
                                    : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                            )}
                        >
                            {isActive && (
                                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-brand-500" />
                            )}
                            <item.icon className={cn("h-5 w-5", isActive ? "text-brand-500" : "text-white/40")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-white/10 p-4 space-y-1">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
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
            <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-ink-950 hidden md:block">
                <SidebarContent role={role} allowedSections={allowedSections} />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileOpen} onOpenChange={onMobileClose}>
                <SheetContent side="left" className="p-0 w-64 bg-ink-950 border-white/10">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <SidebarContent role={role} allowedSections={allowedSections} onItemClick={onMobileClose} />
                </SheetContent>
            </Sheet>
        </>
    );
}
