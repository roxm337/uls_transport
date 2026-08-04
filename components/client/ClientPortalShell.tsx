'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, FileWarning, LayoutDashboard, LogOut, Menu, PackageSearch, Phone } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const nav = [
    { href: '/espace-client', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { href: '/espace-client/expeditions', label: 'Mes expéditions', icon: PackageSearch },
    { href: '/espace-client/reclamations', label: 'Mes litiges', icon: FileWarning },
];

export function ClientPortalShell({ children, companyName, contactName }: {
    children: React.ReactNode;
    companyName: string;
    contactName: string | null;
}) {
    const pathname = usePathname();
    const router = useRouter();

    async function logout() {
        await fetch('/api/client/auth/logout', { method: 'POST' });
        router.push('/espace-client/login');
        router.refresh();
    }

    const links = nav.map(item => {
        const active = item.href === '/espace-client'
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
            <Link key={item.href} href={item.href} className={cn(
                'inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                active ? 'bg-ink-950 text-white' : 'text-slate-500 hover:bg-ink-950/[0.05] hover:text-ink-950',
            )}>
                <item.icon className={cn('h-4 w-4', active && 'text-brand-500')} /> {item.label}
            </Link>
        );
    });

    return (
        <div className="client-portal-canvas min-h-dvh text-ink-950">
            <header className="sticky top-0 z-40 border-b border-ink-950/[0.08] bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex h-[4.75rem] max-w-[1480px] items-center gap-4 px-4 sm:px-6 lg:px-10">
                    <Link href="/espace-client" className="flex h-10 w-28 shrink-0 items-center justify-center rounded-xl bg-brand-500 px-2">
                        <Image src={BRAND.logo} alt={BRAND.name} width={404} height={282} priority className="h-8 w-auto object-contain" />
                    </Link>
                    <span className="hidden h-7 w-px bg-ink-950/10 sm:block" />
                    <nav className="hidden items-center gap-1 md:flex">{links}</nav>
                    <div className="ml-auto hidden min-w-0 items-center gap-3 sm:flex">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-950 text-brand-500"><Building2 className="h-4 w-4" /></span>
                        <div className="hidden min-w-0 lg:block">
                            <p className="max-w-44 truncate text-xs font-semibold">{companyName}</p>
                            <p className="max-w-44 truncate text-[10px] text-slate-400">{contactName || 'Compte client'}</p>
                        </div>
                        <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Se déconnecter" title="Se déconnecter">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Ouvrir la navigation"><Menu className="h-5 w-5" /></Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[19rem] p-5">
                            <SheetTitle className="text-left">{companyName}</SheetTitle>
                            <nav className="mt-6 grid gap-2">{links}</nav>
                            <a href={BRAND.contact.phoneHref} className="mt-8 flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm font-semibold">
                                <Phone className="h-4 w-4" /> {BRAND.contact.phone}
                            </a>
                            <Button variant="outline" className="mt-3 w-full justify-start" onClick={logout}><LogOut className="h-4 w-4" /> Se déconnecter</Button>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
            <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</main>
        </div>
    );
}
