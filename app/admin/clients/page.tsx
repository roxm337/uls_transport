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
import { useAdminRole } from '@/components/admin/AdminLayoutClient';
import {
    CLIENT_STATUSES, CLIENT_STATUS_STYLES, SERVICE_OPTIONS,
    parseServices, serviceShortLabel,
} from '@/lib/crm';
import { Pagination } from '@/components/admin/Pagination';
import {
    fetchClients, fetchStaffOptions, deleteClient,
    type Client, type ClientTotals, type StaffOption,
} from '@/lib/services/clients';

const PAGE_SIZE = 25;

export default function ClientsPage() {
    const role = useAdminRole();
    const isAdmin = role?.toUpperCase?.() === 'ADMIN';

    const [clients, setClients] = React.useState<Client[]>([]);
    const [loading, setLoading] = React.useState(true);
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
    const [paging, setPaging] = React.useState({ pageCount: 1, total: 0, pageSize: PAGE_SIZE });
    // Totals now come from the API: derived from the loaded rows they only ever
    // counted the current page.
    const [totals, setTotals] = React.useState<ClientTotals>({ all: 0, actifs: 0, expeditions: 0 });

    React.useEffect(() => {
        // Resetting the page alongside the debounced term keeps both in one
        // update: sequencing them separately fired a fetch for the new filter
        // against the old page number first.
        const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    React.useEffect(() => {
        fetchStaffOptions().then(setStaff).catch(() => {
            // Losing the picker costs one filter, not the page.
            setStaff([]);
        });
    }, []);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchClients({
                search: debounced, status, service, accountManagerId,
                page, pageSize: PAGE_SIZE,
            });
            setClients(result.items);
            setTotals(result.totals);
            setPaging({ pageCount: result.pageCount, total: result.total, pageSize: result.pageSize });

            // Deleting the last row of the last page can strand us past the end.
            if (result.items.length === 0 && result.page > 1) setPage(result.pageCount);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Chargement impossible.');
        } finally {
            setLoading(false);
        }
    }, [debounced, status, service, accountManagerId, page]);

    React.useEffect(() => { void load(); }, [load]);

    async function handleDelete(client: Client) {
        try {
            const { expeditionsRemoved } = await deleteClient(client.id);
            toast.success(
                expeditionsRemoved > 0
                    ? `${client.companyName} et ses ${expeditionsRemoved} expédition(s) supprimés.`
                    : `${client.companyName} supprimé.`
            );
            void load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Suppression impossible.');
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-ink-950">Clients</h1>
                    <p className="text-sm text-slate-500">
                        Donneurs d&apos;ordre suivis par ULS Transport.
                    </p>
                </div>
                <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-brand-500 text-ink-950 hover:bg-brand-400 gap-2 shrink-0"
                >
                    <Plus className="h-4 w-4" /> Nouveau client
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                    { label: 'Clients', value: totals.all, icon: Building2 },
                    { label: 'Actifs', value: totals.actifs, icon: Users2 },
                    { label: 'Expéditions', value: totals.expeditions, icon: Truck },
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
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher une société, un contact, une ville, un SIRET…"
                                className="pl-9 bg-white"
                            />
                        </div>

                        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[170px] bg-white">
                                <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Tous les statuts</SelectItem>
                                {CLIENT_STATUSES.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
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

                        <Select
                            value={accountManagerId}
                            onValueChange={v => { setAccountManagerId(v); setPage(1); }}
                        >
                            <SelectTrigger className="w-full sm:w-[190px] bg-white">
                                <SelectValue placeholder="Chargé de compte" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Tous les chargés</SelectItem>
                                {/* The clients nobody owns are the ones worth finding. */}
                                <SelectItem value="None">Non attribués</SelectItem>
                                {staff.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
                                    <TableHead>Société</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Ville</TableHead>
                                    <TableHead>Services</TableHead>
                                    <TableHead className="text-center">Expéditions</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                                            Chargement…
                                        </TableCell>
                                    </TableRow>
                                ) : clients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                                            Aucun client ne correspond à ces critères.
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
                                                    {client.status}
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
                        noun="client"
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
                title={`Supprimer ${toDelete?.companyName} ?`}
                description={
                    <>
                        {(toDelete?._count?.expeditions ?? 0) > 0 ? (
                            <>
                                Ses <strong>{toDelete?._count?.expeditions} expédition(s)</strong> et
                                ses contacts seront supprimés avec lui.
                            </>
                        ) : (
                            <>Ce client n&apos;a aucune expédition enregistrée.</>
                        )}
                        {' '}Cette action est irréversible.
                    </>
                }
                confirmLabel="Supprimer le client"
                onConfirm={async () => {
                    if (toDelete) await handleDelete(toDelete);
                    setToDelete(null);
                }}
            />
        </motion.div>
    );
}
