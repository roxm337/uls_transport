'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Search, RefreshCw, Building2, Truck, Users2 } from 'lucide-react';
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
import { ClientDialog } from '@/components/admin/ClientDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { RowActions } from '@/components/admin/RowActions';
import { OperationsMetricRail, OperationsPageHeader } from '@/components/admin/OperationsPage';
import { useAdminRole } from '@/components/admin/AdminLayoutClient';
import { useLanguage } from '@/lib/i18n/context';
import {
    CLIENT_STATUSES, CLIENT_STATUS_STYLES, SERVICE_OPTIONS,
    parseServices, serviceShortLabel,
} from '@/lib/crm';
import { Pagination } from '@/components/admin/Pagination';
import { useQuery } from '@/lib/hooks/use-query';
import {
    fetchClients, fetchStaffOptions, deleteClient,
    type Client, type ClientTotals, type StaffOption,
} from '@/lib/services/clients';

const PAGE_SIZE = 25;

export default function ClientsPage() {
    const { t } = useLanguage();
    const role = useAdminRole();
    const isAdmin = role?.toUpperCase?.() === 'ADMIN';

    const [search, setSearch] = React.useState('');
    const [debounced, setDebounced] = React.useState('');
    const [status, setStatus] = React.useState('All');
    const [service, setService] = React.useState('All');
    const [accountManagerId, setAccountManagerId] = React.useState('All');
    const [staff, setStaff] = React.useState<StaffOption[]>([]);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    // Editing from the row reuses the same dialog: `null` means "create".
    const [editing, setEditing] = React.useState<Client | null>(null);
    const [toDelete, setToDelete] = React.useState<Client | null>(null);
    const [page, setPage] = React.useState(1);

    React.useEffect(() => {
        // Resetting the page alongside the debounced term keeps both in one
        // update: sequencing them separately fired a fetch for the new filter
        // against the old page number first.
        const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    React.useEffect(() => {
        fetchStaffOptions().then(setStaff).catch(() => {
            // Losing the picker costs one filter, not the page.
            setStaff([]);
        });
    }, []);

    const query = useQuery(
        JSON.stringify({ debounced, status, service, accountManagerId, page }),
        () => fetchClients({
            search: debounced, status, service, accountManagerId,
            page, pageSize: PAGE_SIZE,
        }),
        {
            // Deleting the last row of the last page can strand us past the end.
            onSuccess: result => {
                if (result.items.length === 0 && result.page > 1) setPage(result.pageCount);
            },
            onError: error => toast.error(error.message || t.clients.loadFailed),
        },
    );

    const { loading, reload: load } = query;
    const clients: Client[] = query.data?.items ?? [];
    const totals: ClientTotals = query.data?.totals ?? { all: 0, actifs: 0, expeditions: 0 };
    const paging = {
        pageCount: query.data?.pageCount ?? 1,
        total: query.data?.total ?? 0,
        pageSize: query.data?.pageSize ?? PAGE_SIZE,
    };

    async function handleDelete(client: Client) {
        try {
            const { expeditionsRemoved } = await deleteClient(client.id);
            toast.success(
                expeditionsRemoved > 0
                    ? t.clients.deletedWithExpeditions(client.companyName, expeditionsRemoved)
                    : t.clients.deleted(client.companyName)
            );
            void load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.clients.deleteFailed);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <OperationsPageHeader
                code="OPS / CLIENTS"
                title={t.clients.title}
                description={t.clients.subtitle}
                actions={
                <Button
                    onClick={() => setDialogOpen(true)}
                    variant="signal"
                >
                    <Plus className="h-4 w-4" /> {t.clients.new}
                </Button>
                }
            />

            <OperationsMetricRail
                loading={loading}
                items={[
                    { label: t.clients.totalCard, value: totals.all, icon: Building2 },
                    { label: t.clients.activeCard, value: totals.actifs, icon: Users2 },
                    { label: t.clients.expeditionsCard, value: totals.expeditions, icon: Truck },
                ]}
            />

            <Card className="overflow-hidden border-ink-950/[0.08] py-0">
                <CardContent className="p-4 space-y-4">
                    <div
                        className="flex flex-col gap-3 border-b border-ink-950/[0.07] pb-4 sm:flex-row sm:items-center"
                        role="search"
                        aria-label={t.clients.searchPlaceholder}
                    >
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t.clients.searchPlaceholder}
                                aria-label={t.clients.searchPlaceholder}
                                className="pl-9 bg-white"
                            />
                        </div>

                        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[170px] bg-white">
                                <SelectValue placeholder={t.clients.table.status} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">{t.clients.allStatuses}</SelectItem>
                                {CLIENT_STATUSES.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={service} onValueChange={v => { setService(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[220px] bg-white">
                                <SelectValue placeholder={t.clients.table.services} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">{t.clients.allServices}</SelectItem>
                                {SERVICE_OPTIONS.map(o => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={accountManagerId}
                            onValueChange={v => { setAccountManagerId(v); setPage(1); }}
                        >
                            <SelectTrigger className="w-full sm:w-[190px] bg-white">
                                <SelectValue placeholder={t.clientDetail.accountManager} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">{t.clients.allManagers}</SelectItem>
                                {/* The clients nobody owns are the ones worth finding. */}
                                <SelectItem value="None">{t.clients.unassigned}</SelectItem>
                                {staff.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
                                    <TableHead>{t.clients.table.company}</TableHead>
                                    <TableHead>{t.clients.table.contact}</TableHead>
                                    <TableHead>{t.clients.table.city}</TableHead>
                                    <TableHead>{t.clients.table.services}</TableHead>
                                    <TableHead className="text-center">{t.clients.table.expeditions}</TableHead>
                                    <TableHead>{t.clients.table.status}</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                                            {t.common.loading}
                                        </TableCell>
                                    </TableRow>
                                ) : clients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                                            {t.clients.empty}
                                        </TableCell>
                                    </TableRow>
                                ) : clients.map(client => {
                                    const svcs = parseServices(client.services);
                                    return (
                                        <TableRow key={client.id} className="hover:bg-slate-50">
                                            <TableCell>
                                                <Link
                                                    href={`/admin/clients/${client.id}`}
                                                    className="font-semibold text-ink-950 hover:underline"
                                                >
                                                    {client.companyName}
                                                </Link>
                                                {client.siret && (
                                                    <p className="text-[11px] text-slate-400 font-mono">
                                                        {client.siret}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {client.contactName || '—'}
                                                {client.email && (
                                                    <p className="text-[11px] text-slate-400">{client.email}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {client.city || '—'}
                                            </TableCell>
                                            <TableCell>
                                                {svcs.length === 0 ? (
                                                    <span className="text-xs text-slate-400">—</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {svcs.slice(0, 2).map(s => (
                                                            <Badge key={s} variant="outline"
                                                                className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                                                                {serviceShortLabel(s)}
                                                            </Badge>
                                                        ))}
                                                        {svcs.length > 2 && (
                                                            <Badge variant="outline"
                                                                className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">
                                                                +{svcs.length - 2}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-sm font-semibold text-ink-950">
                                                {client._count?.expeditions ?? 0}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline"
                                                    className={CLIENT_STATUS_STYLES[client.status] ?? ''}>
                                                    {t.crm.clientStatus[client.status] ?? client.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <RowActions
                                                    href={`/admin/clients/${client.id}`}
                                                    label={client.companyName}
                                                    onEdit={() => { setEditing(client); setDialogOpen(true); }}
                                                    onDelete={isAdmin ? () => setToDelete(client) : undefined}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <Pagination
                        page={page}
                        pageCount={paging.pageCount}
                        total={paging.total}
                        pageSize={paging.pageSize}
                        shown={clients.length}
                        onPageChange={setPage}
                        disabled={loading}
                        noun={t.pagination.client}
                    />
                </CardContent>
            </Card>

            <ClientDialog
                open={dialogOpen}
                onOpenChange={open => {
                    setDialogOpen(open);
                    // Drop the edit target on close, so the next "Nouveau
                    // client" opens an empty form rather than the last edit.
                    if (!open) setEditing(null);
                }}
                client={editing}
                onSaved={() => void load()}
            />

            <ConfirmDialog
                open={toDelete !== null}
                onOpenChange={open => { if (!open) setToDelete(null); }}
                title={toDelete ? t.clients.deleteTitle(toDelete.companyName) : ''}
                description={
                    <>
                        {(toDelete?._count?.expeditions ?? 0) > 0
                            ? t.clients.deleteWithExpeditions(toDelete?._count?.expeditions ?? 0)
                            : t.clients.deleteNoExpeditions}
                        {' '}{t.common.irreversible}
                    </>
                }
                confirmLabel={t.clients.deleteConfirm}
                onConfirm={async () => {
                    if (toDelete) await handleDelete(toDelete);
                    setToDelete(null);
                }}
            />
        </motion.div>
    );
}
