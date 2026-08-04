import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { ArrowRight, Filter, Search } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getClientSession } from '@/lib/server/client-auth';
import { CLIENT_STATUS_LABELS, formatPortalDate, statusLabel } from '@/lib/client-portal';
import { serviceLabel } from '@/lib/crm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUS_STYLES: Record<string, string> = {
    Demandee: 'border-slate-200 bg-slate-50 text-slate-600',
    Planifiee: 'border-sky-200 bg-sky-50 text-sky-700',
    Enlevee: 'border-amber-200 bg-amber-50 text-amber-700',
    'En transit': 'border-brand-300 bg-brand-50 text-ink-950',
    Livree: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Annulee: 'border-red-200 bg-red-50 text-red-700',
};

export default async function ClientExpeditionsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; status?: string }>;
}) {
    const session = await getClientSession();
    if (!session) redirect('/espace-client/login');
    const params = await searchParams;
    const q = params.q?.trim() ?? '';
    const status = params.status && CLIENT_STATUS_LABELS[params.status] ? params.status : '';

    const where: Prisma.ExpeditionWhereInput = {
        clientId: session.clientId,
        ...(status ? { status } : {}),
        ...(q ? {
            OR: [
                { reference: { contains: q } },
                { pickupCity: { contains: q } },
                { deliveryCity: { contains: q } },
                { goodsDescription: { contains: q } },
            ],
        } : {}),
    };

    const expeditions = await prisma.expedition.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return (
        <div className="space-y-7">
            <header className="border-b border-ink-950/10 pb-7">
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">Historique transport</p>
                <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Mes expéditions</h1>
                <p className="mt-2 text-sm text-slate-500">Retrouvez vos demandes, trajets et statuts de livraison.</p>
            </header>

            <form method="get" className="grid gap-3 rounded-2xl border border-ink-950/[0.08] bg-white p-4 shadow-[0_10px_30px_rgba(10,10,10,.035)] sm:grid-cols-[1fr_13rem_auto]" role="search">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input name="q" defaultValue={q} className="pl-10" placeholder="Référence, ville ou marchandise…" aria-label="Rechercher une expédition" />
                </div>
                <div className="relative">
                    <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select name="status" defaultValue={status} className="h-10 w-full appearance-none rounded-lg border border-input bg-white pl-10 pr-8 text-sm outline-none hover:border-ink-950/20 focus:border-ink-950 focus:ring-3 focus:ring-brand-500/25">
                        <option value="">Tous les statuts</option>
                        {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>
                <Button type="submit" variant="signal">Filtrer</Button>
            </form>

            <div className="hidden overflow-hidden rounded-2xl border border-ink-950/[0.08] bg-white shadow-[0_12px_36px_rgba(10,10,10,.035)] md:block">
                <Table>
                    <TableHeader><TableRow><TableHead>Référence</TableHead><TableHead>Service</TableHead><TableHead>Trajet</TableHead><TableHead>Enlèvement</TableHead><TableHead>Statut</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
                    <TableBody>
                        {expeditions.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-slate-500">Aucune expédition ne correspond à ces critères.</TableCell></TableRow>
                        ) : expeditions.map(expedition => (
                            <TableRow key={expedition.id}>
                                <TableCell><Link href={`/espace-client/expeditions/${expedition.id}`} className="font-mono text-xs font-semibold hover:underline">{expedition.reference}</Link></TableCell>
                                <TableCell className="text-sm text-slate-600">{serviceLabel(expedition.service)}</TableCell>
                                <TableCell className="text-sm text-slate-600">{expedition.pickupCity || '—'} → {expedition.deliveryCity || '—'}</TableCell>
                                <TableCell className="text-sm text-slate-600">{formatPortalDate(expedition.pickupDate)}</TableCell>
                                <TableCell><Badge variant="outline" className={STATUS_STYLES[expedition.status]}>{statusLabel(expedition.status)}</Badge></TableCell>
                                <TableCell><Link href={`/espace-client/expeditions/${expedition.id}`} aria-label={`Voir ${expedition.reference}`}><ArrowRight className="h-4 w-4 text-slate-300" /></Link></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="grid gap-3 md:hidden">
                {expeditions.length === 0 ? <p className="rounded-2xl border border-dashed border-ink-950/15 p-8 text-center text-sm text-slate-500">Aucune expédition ne correspond à ces critères.</p> : expeditions.map(expedition => (
                    <Link key={expedition.id} href={`/espace-client/expeditions/${expedition.id}`} className="rounded-2xl border border-ink-950/[0.08] bg-white p-4 shadow-[0_8px_24px_rgba(10,10,10,.035)]">
                        <div className="flex items-start justify-between gap-3"><span className="font-mono text-xs font-semibold">{expedition.reference}</span><Badge variant="outline" className={STATUS_STYLES[expedition.status]}>{statusLabel(expedition.status)}</Badge></div>
                        <p className="mt-4 font-semibold">{expedition.pickupCity || 'Départ à confirmer'} → {expedition.deliveryCity || 'Arrivée à confirmer'}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>{serviceLabel(expedition.service)}</span><span>{formatPortalDate(expedition.pickupDate)}</span></div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
