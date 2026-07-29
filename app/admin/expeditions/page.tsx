'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Search, RefreshCw, Truck, Package, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ExpeditionDialog } from '@/components/admin/ExpeditionDialog';
import { Pagination } from '@/components/admin/Pagination';
import {
    EXPEDITION_STATUSES, EXPEDITION_STATUS_STYLES,
    expeditionStatusLabel, SERVICE_OPTIONS, serviceShortLabel, formatEuros,
} from '@/lib/crm';
import {
    fetchExpeditions, type Expedition, type ExpeditionTotals,
} from '@/lib/services/clients';

const PAGE_SIZE = 25;

function ExpeditionsContent() {
    const searchParams = useSearchParams();
    const clientId = searchParams.get('clientId') ?? undefined;

    const [expeditions, setExpeditions] = React.useState<Expedition[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [debounced, setDebounced] = React.useState('');
    const [status, setStatus] = React.useState('All');
    const [service, setService] = React.useState('All');
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [paging, setPaging] = React.useState({ pageCount: 1, total: 0, pageSize: PAGE_SIZE });
    // Totals now come from the API: derived from the loaded rows they only ever
    // counted the current page.
    const [totals, setTotals] = React.useState<ExpeditionTotals>({ all: 0, active: 0, delivered: 0 });

    React.useEffect(() => {
        // Resetting the page alongside the debounced term keeps both in one
        // update: sequencing them separately fired a fetch for the new filter
        // against the old page number first.
        const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchExpeditions({
                search: debounced, status, service, clientId, page, pageSize: PAGE_SIZE,
            });
            setExpeditions(result.items);
            setTotals(result.totals);
            setPaging({ pageCount: result.pageCount, total: result.total, pageSize: result.pageSize });

            // Deleting the last row of the last page can strand us past the end.
            if (result.items.length === 0 && result.page > 1) setPage(result.pageCount);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Chargement impossible.');
        } finally {
            setLoading(false);
        }
    }, [debounced, status, service, clientId, page]);

    React.useEffect(() => { void load(); }, [load]);

    const clientName = clientId ? expeditions[0]?.client?.companyName : null;

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-ink-950">Expéditions</h1>
                    <p className="text-sm text-slate-500">
                        {clientId
                            ? <>Transports de <span className="font-medium text-ink-950">{clientName ?? 'ce client'}</span>. <Link href="/admin/expeditions" className="underline">Voir toutes</Link></>
                            : 'Tous les transports opérés par ULS Transport.'}
                    </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}
                    className="bg-brand-500 text-ink-950 hover:bg-brand-400 gap-2 shrink-0">
                    <Plus className="h-4 w-4" /> Nouvelle expédition
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                    { label: 'Total', value: totals.all, icon: Package },
                    { label: 'En cours', value: totals.active, icon: Truck },
                    { label: 'Livrées', value: totals.delivered, icon: CheckCircle2 },
                ].map(card => (
                    <Card key={card.label} className="border-slate-200">
                        <CardContent className="flex items-center gap-3 p-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-950">
                                <card.icon className="h-5 w-5 text-brand-500" />
                            </span>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                    {card.label}
                                </p>
                                <p className="text-xl font-bold text-ink-950">
                                    {loading ? '—' : card.value}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-slate-200">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Référence, client, ville, marchandise…"
                                className="pl-9 bg-white" />
                        </div>

                        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[170px] bg-white">
                                <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Tous les statuts</SelectItem>
                                {EXPEDITION_STATUSES.map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={service} onValueChange={v => { setService(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[220px] bg-white">
                                <SelectValue placeholder="Service" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Tous les services</SelectItem>
                                {SERVICE_OPTIONS.map(o => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="outline" className="bg-white shrink-0"
                            onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="rounded-lg border border-slate-200 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Référence</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Trajet</TableHead>
                                    <TableHead>Enlèvement</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Prix HT</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                                            Chargement…
                                        </TableCell>
                                    </TableRow>
                                ) : expeditions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                                            Aucune expédition ne correspond à ces critères.
                                        </TableCell>
                                    </TableRow>
                                ) : expeditions.map(e => (
                                    <TableRow key={e.id} className="hover:bg-slate-50">
                                        <TableCell>
                                            <Link href={`/admin/expeditions/${e.id}`}
                                                className="font-mono text-xs font-semibold text-ink-950 hover:underline">
                                                {e.reference}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {e.client ? (
                                                <Link href={`/admin/clients/${e.client.id}`}
                                                    className="hover:underline">{e.client.companyName}</Link>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {serviceShortLabel(e.service)}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {[e.pickupCity, e.deliveryCity].filter(Boolean).join(' → ') || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {e.pickupDate
                                                ? new Date(e.pickupDate).toLocaleDateString('fr-FR')
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={EXPEDITION_STATUS_STYLES[e.status] ?? ''}>
                                                {expeditionStatusLabel(e.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium">
                                            {formatEuros(e.priceHt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <Pagination
                        page={page}
                        pageCount={paging.pageCount}
                        total={paging.total}
                        pageSize={paging.pageSize}
                        shown={expeditions.length}
                        onPageChange={setPage}
                        disabled={loading}
                        noun="expédition"
                    />
                </CardContent>
            </Card>

            <ExpeditionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                defaultClientId={clientId}
                onSaved={() => void load()}
            />
        </motion.div>
    );
}

export default function ExpeditionsPage() {
    // useSearchParams needs a Suspense boundary in the app router.
    return (
        <React.Suspense fallback={<div className="h-64" />}>
            <ExpeditionsContent />
        </React.Suspense>
    );
}
