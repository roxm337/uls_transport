'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Settings, LogOut } from 'lucide-react';
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/75 px-4 md:px-6 backdrop-blur-sm">
            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
                <Button variant="ghost" size="icon" onClick={onMobileMenuClick}>
                    <Menu className="h-5 w-5" />
                </Button>
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
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                <Avatar className="h-9 w-9">
                                    {account.logo && <AvatarImage src={account.logo} alt={account.name} />}
                                    <AvatarFallback>{initial(account)}</AvatarFallback>
                                </Avatar>
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
                            {/* Settings is ADMIN-only, matching the middleware
                                guard — offering it to a MANAGER would lead
                                straight to a redirect. */}
                            {role === 'ADMIN' && (
                                <DropdownMenuItem asChild>
                                    <Link href="/admin/settings" className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />
                                        {t.header.settings}
                                    </Link>
                                </DropdownMenuItem>
                            )}
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
