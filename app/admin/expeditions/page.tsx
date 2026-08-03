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
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { RowActions } from '@/components/admin/RowActions';
import { OperationsMetricRail, OperationsPageHeader } from '@/components/admin/OperationsPage';
import { useAdminRole } from '@/components/admin/AdminLayoutClient';
import { useLanguage } from '@/lib/i18n/context';
import { Pagination } from '@/components/admin/Pagination';
import {
    EXPEDITION_STATUSES, EXPEDITION_STATUS_STYLES,
    SERVICE_OPTIONS, serviceShortLabel, formatEuros,
} from '@/lib/crm';
import {
    fetchExpeditions, deleteExpedition,
    type Expedition, type ExpeditionTotals,
} from '@/lib/services/clients';

const PAGE_SIZE = 25;

function ExpeditionsContent() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const clientId = searchParams.get('clientId') ?? undefined;
    const createOnArrival = searchParams.get('new') === '1';
    const role = useAdminRole();
    const isAdmin = role?.toUpperCase?.() === 'ADMIN';

    const [expeditions, setExpeditions] = React.useState<Expedition[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [debounced, setDebounced] = React.useState('');
    const [status, setStatus] = React.useState('All');
    const [service, setService] = React.useState('All');
    const [dialogOpen, setDialogOpen] = React.useState(createOnArrival);
    // Editing from the row reuses the same dialog: `null` means "create".
    const [editing, setEditing] = React.useState<Expedition | null>(null);
    const [toDelete, setToDelete] = React.useState<Expedition | null>(null);
    const [page, setPage] = React.useState(1);
    const [paging, setPaging] = React.useState({ pageCount: 1, total: 0, pageSize: PAGE_SIZE });
    // Totals now come from the API: derived from the loaded rows they only ever
    // counted the current page.
    const [totals, setTotals] = React.useState<ExpeditionTotals>({ all: 0, active: 0, delivered: 0 });

    React.useEffect(() => {
        // Resetting the page alongside the debounced term keeps both in one
        // update: sequencing them separately fired a fetch for the new filter
        // against the old page number first.
        const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
        return () => clearTimeout(timer);
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
            toast.error(error instanceof Error ? error.message : t.expeditions.loadFailed);
        } finally {
            setLoading(false);
        }
    }, [debounced, status, service, clientId, page, t]);

    React.useEffect(() => { void load(); }, [load]);

    async function handleDelete(expedition: Expedition) {
        try {
            await deleteExpedition(expedition.id);
            toast.success(t.expeditions.deleted(expedition.reference));
            void load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.expeditions.deleteFailed);
        }
    }

    const clientName = clientId ? expeditions[0]?.client?.companyName : null;

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <OperationsPageHeader
                code="OPS / FRET"
                title={t.expeditions.title}
                description={
                    <>
                        {clientId
                            ? <>{t.expeditions.forClient(clientName ?? t.expeditions.thisClient)} <Link href="/admin/expeditions" className="underline">{t.expeditions.seeAllLink}</Link></>
                            : t.expeditions.subtitle}
                    </>
                }
                actions={
                <Button onClick={() => setDialogOpen(true)} variant="signal">
                    <Plus className="h-4 w-4" /> {t.expeditions.new}
                </Button>
                }
            />

            <OperationsMetricRail
                loading={loading}
                items={[
                    { label: t.expeditions.totalCard, value: totals.all, icon: Package },
                    { label: t.expeditions.activeCard, value: totals.active, icon: Truck },
                    { label: t.expeditions.deliveredCard, value: totals.delivered, icon: CheckCircle2 },
                ]}
            />

            <Card className="overflow-hidden border-ink-950/[0.08] py-0">
                <CardContent className="p-4 space-y-4">
                    <div
                        className="flex flex-col gap-3 border-b border-ink-950/[0.07] pb-4 sm:flex-row sm:items-center"
                        role="search"
                        aria-label={t.expeditions.searchPlaceholder}
                    >
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder={t.expeditions.searchPlaceholder}
                                aria-label={t.expeditions.searchPlaceholder}
                                className="pl-9 bg-white" />
                        </div>

                        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[170px] bg-white">
                                <SelectValue placeholder={t.expeditions.table.status} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">{t.expeditions.allStatuses}</SelectItem>
                                {EXPEDITION_STATUSES.map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={service} onValueChange={v => { setService(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[220px] bg-white">
                                <SelectValue placeholder={t.expeditions.table.service} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">{t.expeditions.allServices}</SelectItem>
                                {SERVICE_OPTIONS.map(o => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="outline" className="bg-white shrink-0"
                            onClick={() => void load()} disabled={loading}
                            aria-label={t.common.refresh} title={t.common.refresh}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-ink-950/[0.08]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.expeditions.table.reference}</TableHead>
                                    <TableHead>{t.expeditions.table.client}</TableHead>
                                    <TableHead>{t.expeditions.table.service}</TableHead>
                                    <TableHead>{t.expeditions.table.route}</TableHead>
                                    <TableHead>{t.expeditions.table.pickup}</TableHead>
                                    <TableHead>{t.expeditions.table.status}</TableHead>
                                    <TableHead className="text-right">{t.expeditions.table.price}</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500">
                                            {t.common.loading}
                                        </TableCell>
                                    </TableRow>
                                ) : expeditions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500">
                                            {t.expeditions.empty}
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
                                                ? new Date(e.pickupDate).toLocaleDateString(t.locale)
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={EXPEDITION_STATUS_STYLES[e.status] ?? ''}>
                                                {t.crm.expeditionStatus[e.status] ?? e.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium">
                                            {formatEuros(e.priceHt, t.locale)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <RowActions
                                                href={`/admin/expeditions/${e.id}`}
                                                label={e.reference}
                                                onEdit={() => { setEditing(e); setDialogOpen(true); }}
                                                onDelete={isAdmin ? () => setToDelete(e) : undefined}
                                            />
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
                        noun={t.pagination.expedition}
                    />
                </CardContent>
            </Card>

            <ExpeditionDialog
                open={dialogOpen}
                onOpenChange={open => {
                    setDialogOpen(open);
                    // Drop the edit target on close, so "Nouvelle expédition"
                    // opens an empty form rather than the last edit.
                    if (!open) setEditing(null);
                }}
                expedition={editing}
                defaultClientId={clientId}
                onSaved={() => void load()}
            />

            <ConfirmDialog
                open={toDelete !== null}
                onOpenChange={open => { if (!open) setToDelete(null); }}
                title={toDelete ? t.expeditions.deleteTitle(toDelete.reference) : ''}
                description={`${t.expeditions.deleteBody} ${t.common.irreversible}`}
                confirmLabel={t.expeditions.deleteConfirm}
                onConfirm={async () => {
                    if (toDelete) await handleDelete(toDelete);
                    setToDelete(null);
                }}
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
