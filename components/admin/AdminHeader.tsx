'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Menu, Settings, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from '@/components/ui/badge';

import { LanguageSwitcher } from '@/components/admin/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n/context';
import type { AdminAccount } from '@/components/admin/AdminLayoutClient';
import { BRAND } from '@/lib/brand';

interface AdminHeaderProps {
    onMobileMenuClick?: () => void;
    /** The signed-in account, resolved server-side by the admin layout. */
    account?: AdminAccount | null;
    role?: string;
}

/** First letter of the name, or of the e-mail when no name is set. */
function initial(account: AdminAccount): string {
    return (account.name || account.email || '?').charAt(0).toUpperCase();
}

export function AdminHeader({ onMobileMenuClick, account, role }: AdminHeaderProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();

    const sections = [
        ['/admin/clients', t.sidebar.clients],
        ['/admin/expeditions', t.sidebar.expeditions],
        ['/admin/analytics', t.sidebar.analytics],
        ['/admin/users', t.sidebar.team],
        ['/admin/messaging', t.sidebar.messaging],
        ['/admin/logs', t.sidebar.logs],
        ['/admin/settings', t.sidebar.settings],
    ] as const;
    const currentSection = sections.find(([href]) => pathname.startsWith(href))?.[1] ?? t.sidebar.dashboard;

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <header className="sticky top-0 z-30 flex h-[4.5rem] items-center gap-4 border-b border-ink-950/[0.07] bg-white/85 px-4 shadow-[0_1px_0_rgba(255,255,255,.8)] backdrop-blur-xl md:px-8">
            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 lg:hidden">
                <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label={t.header.openNav}>
                    <Menu className="h-5 w-5" />
                </Button>
                <span className="flex h-9 w-[5.5rem] items-center justify-center rounded-lg bg-brand-500 px-1.5">
                    <Image src={BRAND.logo} alt={BRAND.name} width={404} height={282} className="h-7 w-auto object-contain" />
                </span>
            </div>

            <div className="hidden min-w-0 items-center gap-2 lg:flex">
                <span className="text-xs font-medium text-slate-400">ULS</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                <span className="truncate text-sm font-semibold text-ink-950">{currentSection}</span>
            </div>

            <div className="flex items-center gap-2 md:gap-4 ml-auto">
                <LanguageSwitcher />

                {/* This menu sat commented out, so nothing anywhere named the
                    account you were signed in as — on a tool where ADMIN and
                    MANAGER see different data, that is worth knowing at a
                    glance. */}
                {account && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-11 gap-2 rounded-xl px-1.5 pr-2.5">
                                <Avatar className="h-8 w-8 border border-ink-950/10">
                                    {account.logo && <AvatarImage src={account.logo} alt={account.name} />}
                                    <AvatarFallback>{initial(account)}</AvatarFallback>
                                </Avatar>
                                <span className="hidden max-w-36 truncate text-xs font-semibold text-ink-800 sm:block">
                                    {account.name}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-60" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{account.name}</p>
                                    <p className="truncate text-xs leading-none text-muted-foreground">
                                        {account.email}
                                    </p>
                                    {role && (
                                        <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                                            {role}
                                        </Badge>
                                    )}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/admin/settings" className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    {t.header.settings}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={handleLogout}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                {t.header.logout}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
