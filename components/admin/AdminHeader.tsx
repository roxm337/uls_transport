'use client';

import { Menu } from 'lucide-react';
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

import { LanguageSwitcher } from '@/components/admin/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n/context';

interface AdminHeaderProps {
    onMobileMenuClick?: () => void;
}

export function AdminHeader({ onMobileMenuClick }: AdminHeaderProps) {
    const { t } = useLanguage();

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

                {/* <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src="/avatars/01.png" alt="Admin" />
                                <AvatarFallback>AD</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">Admin User</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    admin@uls-transport.com
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            {t.header.profile}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            {t.header.settings}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600">
                            {t.header.logout}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu> */}
            </div>
        </header>
    );
}
