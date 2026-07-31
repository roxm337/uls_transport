'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    ArrowLeft, ArrowRight, Pencil, Trash, Loader2, MapPin, Package, Truck,
    Thermometer, Euro, Building2, CalendarDays, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ExpeditionDialog } from '@/components/admin/ExpeditionDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
    EXPEDITION_STATUSES, EXPEDITION_STATUS_STYLES, expeditionStatusLabel,
    serviceLabel, formatEuros,
} from '@/lib/crm';
import {
    fetchExpedition, updateExpedition, deleteExpedition,
    type Expedition, type ExpeditionEvent, type NotifyOutcome,
} from '@/lib/services/clients';
import { useAdminRole } from '@/components/admin/AdminLayoutClient';
import { useLanguage } from '@/lib/i18n/context';

export default function ExpeditionDetailPage() {
    const { t } = useLanguage();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const role = useAdminRole();
    const isAdmin = role?.toUpperCase?.() === 'ADMIN';

    const [expedition, setExpedition] = React.useState<Expedition | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [editOpen, setEditOpen] = React.useState(false);
    const [updatingStatus, setUpdatingStatus] = React.useState(false);
    const [confirmDelete, setConfirmDelete] = React.useState(false);
    // A status the operator has picked but not yet committed, held here so a
    // note can be attached to the transition before it is written.
    const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
    const [statusNote, setStatusNote] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            setExpedition(await fetchExpedition(id));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.expeditionDetail.missing);
        } finally {
            setLoading(false);
        }
    }, [id]);

    React.useEffect(() => { void load(); }, [load]);

    async function changeStatus(status: string, note?: string) {
        setUpdatingStatus(true);
        try {
            const { expedition: updated, notified } = await updateExpedition(id, {
                status,
                statusNote: note?.trim() || undefined,
            });
            setExpedition(prev => prev ? { ...prev, status: updated.status } : prev);
            toast.success(
                t.expeditionDetail.statusChanged(t.crm.expeditionStatus[status] ?? status),
                { description: describeNotification(notified, t) },
            );
            // Reload so the transition shows up in the timeline.
            void load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.expeditionDetail.statusUpdateFailed);
        } finally {
            setUpdatingStatus(false);
        }
    }

    async function handleDelete() {
        try {
            await deleteExpedition(id);
            toast.success(t.expeditions.deleted(expedition?.reference ?? ''));
            router.push('/admin/expeditions');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.expeditions.deleteFailed);
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    if (!expedition) {
        return (
            <div className="space-y-4">
                <Link href="/admin/expeditions" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink-950">
                    <ArrowLeft className="h-4 w-4" /> {t.expeditionDetail.back}
                </Link>
                <p className="text-sm text-slate-500">{t.expeditionDetail.missing}</p>
            </div>
        );
    }

    const fmtDate = (v: string | null) =>
        v ? new Date(v).toLocaleDateString(t.locale, { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Link href="/admin/expeditions" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink-950">
                <ArrowLeft className="h-4 w-4" /> {t.expeditionDetail.back}
            </Link>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-950">
                        <Truck className="h-6 w-6 text-brand-500" />
                    </span>
                    <div>
                        <h1 className="font-mono text-2xl font-black tracking-tight text-ink-950">
                            {expedition.reference}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="outline" className={EXPEDITION_STATUS_STYLES[expedition.status] ?? ''}>
                                {t.crm.expeditionStatus[expedition.status] ?? expedition.status}
                            </Badge>
                            <span className="text-slate-500">{serviceLabel(expedition.service)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                    <Select
                        value={expedition.status}
                        onValueChange={value => {
                            // Opens the note prompt rather than committing
                            // straight away: a transition is the moment an
                            // operator has something to say about it.
                            if (value !== expedition.status) {
                                setStatusNote('');
                                setPendingStatus(value);
                            }
                        }}
                        disabled={updatingStatus}
                    >
                        <SelectTrigger className="w-[170px] bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EXPEDITION_STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value}>
                                    {t.crm.expeditionStatus[s.value] ?? s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                        <Pencil className="h-4 w-4" /> {t.common.edit}
                    </Button>
                    {isAdmin && (
                        <Button variant="outline" onClick={() => setConfirmDelete(true)}
                            className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700">
                            <Trash className="h-4 w-4" /> {t.common.delete}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="h-4 w-4 text-slate-400" /> {t.expeditionDetail.pickup}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p className="text-slate-800">{expedition.pickupAddress || '—'}</p>
                        <p className="text-slate-600">
                            {[expedition.pickupPostalCode, expedition.pickupCity].filter(Boolean).join(' ') || '—'}
                        </p>
                        <p className="flex items-center gap-2 pt-2 text-slate-600">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                            {fmtDate(expedition.pickupDate)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="h-4 w-4 text-brand-500" /> {t.expeditionDetail.delivery}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p className="text-slate-800">{expedition.deliveryAddress || '—'}</p>
                        <p className="text-slate-600">
                            {[expedition.deliveryPostalCode, expedition.deliveryCity].filter(Boolean).join(' ') || '—'}
                        </p>
                        <p className="flex items-center gap-2 pt-2 text-slate-600">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                            {fmtDate(expedition.deliveryDate)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Building2 className="h-4 w-4 text-slate-400" /> {t.expeditionDetail.client}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {expedition.client ? (
                            <Link href={`/admin/clients/${expedition.client.id}`}
                                className="font-semibold text-ink-950 hover:underline">
                                {expedition.client.companyName}
                            </Link>
                        ) : <p className="text-slate-500">—</p>}
                        <p className="flex items-center gap-2 pt-2 text-slate-800">
                            <Euro className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold">{formatEuros(expedition.priceHt, t.locale)}</span>
                            <span className="text-xs text-slate-400">HT</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Package className="h-4 w-4 text-slate-400" /> {t.expeditionDetail.goods}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-sm text-slate-800">
                        {expedition.goodsDescription || t.expeditionDetail.noGoods}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-4">
                        <Stat label={t.expeditionDetail.packages} value={expedition.packages?.toString() ?? '—'} />
                        <Stat label={t.expeditionDetail.weight} value={expedition.weightKg ? `${expedition.weightKg} kg` : '—'} />
                        <Stat label={t.expeditionDetail.vehicle} value={expedition.vehicleType ?? '—'} />
                        {expedition.temperature && (
                            <Stat
                                label={t.expeditionDetail.temperature}
                                value={expedition.temperature}
                                icon={Thermometer}
                            />
                        )}
                    </div>
                    {expedition.notes && (
                        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                {t.expeditionDetail.operationsNotes}
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-slate-700">{expedition.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <History className="h-4 w-4 text-slate-400" /> {t.expeditionDetail.history}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Timeline events={expedition.events ?? []} />
                </CardContent>
            </Card>

            <ExpeditionDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                expedition={expedition}
                onSaved={() => void load()}
            />

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={t.expeditions.deleteTitle(expedition.reference)}
                description={`${t.expeditions.deleteBody} ${t.common.irreversible}`}
                confirmLabel={t.expeditions.deleteConfirm}
                onConfirm={handleDelete}
            />

            <Dialog
                open={pendingStatus !== null}
                onOpenChange={open => { if (!open) setPendingStatus(null); }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {t.expeditionDetail.transitionTitle(pendingStatus ? (t.crm.expeditionStatus[pendingStatus] ?? pendingStatus) : '')}
                        </DialogTitle>
                        <DialogDescription>
                            {t.expeditionDetail.transitionFrom(t.crm.expeditionStatus[expedition.status] ?? expedition.status)}{' '}
                            {t.expeditionDetail.transitionHint}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="status-note">{t.expeditionDetail.noteLabel}</Label>
                        <Textarea
                            id="status-note"
                            rows={3}
                            value={statusNote}
                            onChange={e => setStatusNote(e.target.value)}
                            placeholder={t.expeditionDetail.notePlaceholder}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPendingStatus(null)}
                            disabled={updatingStatus}
                        >
                            {t.common.cancel}
                        </Button>
                        <Button
                            className="bg-brand-500 text-ink-950 hover:bg-brand-400"
                            disabled={updatingStatus}
                            onClick={async () => {
                                if (!pendingStatus) return;
                                await changeStatus(pendingStatus, statusNote);
                                setPendingStatus(null);
                            }}
                        >
                            {updatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.common.confirm}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

/**
 * What the automatic notification did, for the toast that follows a status
 * change. Returns undefined when nothing was configured — silence is the
 * normal case and does not deserve a line of its own.
 */
function describeNotification(
    notified: NotifyOutcome | null | undefined,
    t: ReturnType<typeof useLanguage>['t'],
): string | undefined {
    if (!notified) return undefined;

    const sent = [
        notified.emailSent && t.expeditionDetail.channelEmail,
        notified.whatsappSent && t.expeditionDetail.channelWhatsapp,
        notified.staffNotified && t.expeditionDetail.channelStaff,
    ].filter(Boolean) as string[];

    return sent.length > 0 ? t.expeditionDetail.notified(sent.join(', ')) : undefined;
}

function Timeline({ events }: { events: ExpeditionEvent[] }) {
    const { t } = useLanguage();

    if (events.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-slate-500">
                {t.expeditionDetail.emptyHistory}
            </p>
        );
    }

    const fmt = (v: string) =>
        new Date(v).toLocaleString(t.locale, {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    return (
        <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {events.map(event => (
                <li key={event.id} className="relative">
                    <span
                        className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${event.type === 'created' ? 'bg-slate-300' : 'bg-brand-500'
                            }`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        {event.type === 'created' ? (
                            <span className="text-sm font-medium text-ink-950">
                                {t.expeditionDetail.created}
                            </span>
                        ) : (
                            <span className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
                                {event.previousStatus && (
                                    <>
                                        <span className="text-slate-500">
                                            {t.crm.expeditionStatus[event.previousStatus] ?? event.previousStatus}
                                        </span>
                                        <ArrowRight className="h-3 w-3 text-slate-400" />
                                    </>
                                )}
                                <span className="font-medium text-ink-950">
                                    {event.status ? (t.crm.expeditionStatus[event.status] ?? event.status) : '—'}
                                </span>
                            </span>
                        )}
                        {event.type === 'created' && event.status && (
                            <Badge
                                variant="outline"
                                className={`text-[10px] ${EXPEDITION_STATUS_STYLES[event.status] ?? ''}`}
                            >
                                {t.crm.expeditionStatus[event.status] ?? event.status}
                            </Badge>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {fmt(event.createdAt)}
                        {event.userName && <> · {event.userName}</>}
                    </p>
                    {event.note && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                            {event.note}
                        </p>
                    )}
                </li>
            ))}
        </ol>
    );
}

function Stat({ label, value, icon: Icon }: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
}) {
    return (
        <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                {label}
            </p>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-950">
                {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
                {value}
            </p>
        </div>
    );
}
