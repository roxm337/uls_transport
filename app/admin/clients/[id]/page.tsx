'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Pencil, Trash, Plus, Mail, Phone, MapPin, FileText,
    Building2, Truck, Star, Loader2, UserRound, BellRing, BellOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ClientDialog } from '@/components/admin/ClientDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
    CLIENT_STATUS_STYLES, EXPEDITION_STATUS_STYLES,
    parseServices, serviceLabel, serviceShortLabel, formatEuros,
} from '@/lib/crm';
import {
    fetchClient, deleteClient, createContact, deleteContact,
    type Client, type ClientContact,
} from '@/lib/services/clients';
import { useAdminRole } from '@/components/admin/AdminLayoutClient';
import { useLanguage } from '@/lib/i18n/context';

export default function ClientDetailPage() {
    const { t } = useLanguage();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const role = useAdminRole();
    const isAdmin = role?.toUpperCase?.() === 'ADMIN';

    const [client, setClient] = React.useState<Client | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [editOpen, setEditOpen] = React.useState(false);
    const [contactOpen, setContactOpen] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [confirmDelete, setConfirmDelete] = React.useState(false);
    const [contactToDelete, setContactToDelete] = React.useState<ClientContact | null>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            setClient(await fetchClient(id));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.clientDetail.notFound);
        } finally {
            setLoading(false);
        }
    }, [id]);

    React.useEffect(() => { void load(); }, [load]);

    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteClient(id);
            toast.success(t.clientDetail.clientDeleted);
            router.push('/admin/clients');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.clients.deleteFailed);
            setDeleting(false);
        }
    }

    async function handleDeleteContact(contact: ClientContact) {
        try {
            await deleteContact(contact.id);
            toast.success(t.clientDetail.contactDeleted);
            void load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.clients.deleteFailed);
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="space-y-4">
                <Link href="/admin/clients" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink-950">
                    <ArrowLeft className="h-4 w-4" /> {t.clientDetail.back}
                </Link>
                <p className="text-sm text-slate-500">{t.clientDetail.missing}</p>
            </div>
        );
    }

    const services = parseServices(client.services);
    const expeditions = client.expeditions ?? [];
    const contacts = client.contacts ?? [];
    // The API caps the embedded list at 50; the count is the real total, so
    // a busy client's history is never presented as shorter than it is.
    const totalExpeditions = client._count?.expeditions ?? expeditions.length;
    const truncated = totalExpeditions > expeditions.length;

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Link href="/admin/clients" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink-950">
                <ArrowLeft className="h-4 w-4" /> {t.clientDetail.back}
            </Link>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-950">
                        <Building2 className="h-6 w-6 text-brand-500" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-ink-950">
                            {client.companyName}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={CLIENT_STATUS_STYLES[client.status] ?? ''}>
                                {t.crm.clientStatus[client.status] ?? client.status}
                            </Badge>
                            {/* Whether ULS writes to this client automatically.
                                Worth seeing without opening the form: it is the
                                difference between a silent client and one that
                                gets a message on every status change. */}
                            <Badge
                                variant="outline"
                                className={client.notificationsEnabled
                                    ? 'gap-1 border-sky-200 bg-sky-50 text-sky-700'
                                    : 'gap-1 border-slate-200 bg-slate-50 text-slate-500'}
                            >
                                {client.notificationsEnabled
                                    ? <><BellRing className="h-3 w-3" /> {t.clientDetail.notificationsOn}</>
                                    : <><BellOff className="h-3 w-3" /> {t.clientDetail.notificationsOff}</>}
                            </Badge>
                            {client.siret && (
                                <span className="text-xs font-mono text-slate-400">SIRET {client.siret}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                        <Pencil className="h-4 w-4" /> {t.common.edit}
                    </Button>
                    {isAdmin && (
                        <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting}
                            className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700">
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                            {t.common.delete}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Coordinates */}
                <Card className="border-slate-200 lg:col-span-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t.clientDetail.coordinates}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <Row icon={Building2} label={t.clientDetail.contact} value={client.contactName} />
                        <Row icon={Mail} label={t.clientDetail.email} value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
                        <Row icon={Phone} label={t.clientDetail.phone} value={client.phone} href={client.phone ? `tel:${client.phone.replace(/\s/g, '')}` : undefined} />
                        <Row
                            icon={MapPin}
                            label={t.clientDetail.address}
                            value={[client.addressLine, [client.postalCode, client.city].filter(Boolean).join(' '), client.country]
                                .filter(Boolean).join(', ') || null}
                        />
                        <Row icon={FileText} label={t.clientDetail.paymentTerms} value={client.paymentTerms} />
                        {client.vatNumber && <Row icon={FileText} label={t.clientDetail.vatNumber} value={client.vatNumber} />}
                        <Row
                            icon={UserRound}
                            label={t.clientDetail.accountManager}
                            value={client.accountManager?.name ?? null}
                        />
                    </CardContent>
                </Card>

                {/* Services */}
                <Card className="border-slate-200 lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t.clientDetail.services}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {services.length === 0 ? (
                            <p className="text-sm text-slate-500">{t.clientDetail.noServices}</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {services.map(s => (
                                    <span key={s}
                                        className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-medium text-ink-950">
                                        <Truck className="h-3.5 w-3.5" />
                                        {serviceLabel(s)}
                                    </span>
                                ))}
                            </div>
                        )}
                        {client.notes && (
                            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                    {t.clientDetail.notes}
                                </p>
                                <p className="whitespace-pre-wrap text-sm text-slate-700">{client.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Contacts */}
            <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">{t.clientDetail.contacts(contacts.length)}</CardTitle>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => setContactOpen(true)}>
                        <Plus className="h-4 w-4" /> {t.common.add}
                    </Button>
                </CardHeader>
                <CardContent>
                    {contacts.length === 0 ? (
                        <p className="text-sm text-slate-500">{t.clientDetail.noContacts}</p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {contacts.map(c => (
                                <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="flex items-center gap-1.5 font-semibold text-ink-950">
                                                {c.name}
                                                {c.isPrimary && <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />}
                                            </p>
                                            {c.role && <p className="text-xs text-slate-500">{c.role}</p>}
                                        </div>
                                        <button
                                            onClick={() => setContactToDelete(c)}
                                            className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                            aria-label={`${t.common.delete} ${c.name}`}
                                        >
                                            <Trash className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {c.email && (
                                        <a href={`mailto:${c.email}`} className="mt-2 block truncate text-xs text-slate-600 hover:text-ink-950">
                                            {c.email}
                                        </a>
                                    )}
                                    {c.phone && <p className="text-xs text-slate-600">{c.phone}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Expeditions */}
            <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">{t.clientDetail.expeditions(totalExpeditions)}</CardTitle>
                    <Link href={`/admin/expeditions?clientId=${client.id}`}>
                        <Button size="sm" variant="outline">{t.common.seeAll}</Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {expeditions.length === 0 ? (
                        <p className="text-sm text-slate-500">{t.clientDetail.noExpeditions}</p>
                    ) : (
                        <div className="rounded-lg border border-slate-200 overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>{t.expeditions.table.reference}</TableHead>
                                        <TableHead>{t.expeditions.table.service}</TableHead>
                                        <TableHead>{t.expeditions.table.route}</TableHead>
                                        <TableHead>{t.expeditions.table.status}</TableHead>
                                        <TableHead className="text-right">{t.expeditions.table.price}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expeditions.map(e => (
                                        <TableRow key={e.id} className="hover:bg-slate-50">
                                            <TableCell>
                                                <Link href={`/admin/expeditions/${e.id}`}
                                                    className="font-mono text-xs font-semibold text-ink-950 hover:underline">
                                                    {e.reference}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-sm">{serviceShortLabel(e.service)}</TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {[e.pickupCity, e.deliveryCity].filter(Boolean).join(' → ') || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={EXPEDITION_STATUS_STYLES[e.status] ?? ''}>
                                                    {t.crm.expeditionStatus[e.status] ?? e.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-medium">
                                                {formatEuros(e.priceHt, t.locale)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {truncated && (
                        <p className="mt-3 text-xs text-slate-500">
                            {t.clientDetail.truncated(expeditions.length, totalExpeditions)}{' '}
                            <Link href={`/admin/expeditions?clientId=${client.id}`} className="underline">
                                {t.clientDetail.seeAllExpeditions}
                            </Link>
                        </p>
                    )}
                </CardContent>
            </Card>

            <ClientDialog open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={() => void load()} />
            <ContactDialog open={contactOpen} onOpenChange={setContactOpen} clientId={client.id} onSaved={() => void load()} />

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={t.clients.deleteTitle(client.companyName)}
                description={
                    <>
                        {totalExpeditions > 0
                            ? t.clients.deleteWithExpeditions(totalExpeditions)
                            : t.clients.deleteNoExpeditions}
                        {' '}{t.common.irreversible}
                    </>
                }
                confirmLabel={t.clients.deleteConfirm}
                onConfirm={handleDelete}
            />

            <ConfirmDialog
                open={contactToDelete !== null}
                onOpenChange={open => { if (!open) setContactToDelete(null); }}
                title={t.clientDetail.deleteContactTitle}
                description={t.clientDetail.deleteContactBody(contactToDelete?.name ?? '', client.companyName)}
                confirmLabel={t.common.delete}
                onConfirm={async () => {
                    if (contactToDelete) await handleDeleteContact(contactToDelete);
                    setContactToDelete(null);
                }}
            />
        </motion.div>
    );
}

function Row({ icon: Icon, label, value, href }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value?: string | null;
    href?: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
                {href && value ? (
                    <a href={href} className="break-words text-slate-800 hover:text-ink-950 hover:underline">{value}</a>
                ) : (
                    <p className="break-words text-slate-800">{value || '—'}</p>
                )}
            </div>
        </div>
    );
}

function ContactDialog({ open, onOpenChange, clientId, onSaved }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    clientId: string;
    onSaved: () => void;
}) {
    const { t } = useLanguage();
    const [form, setForm] = React.useState({ name: '', role: '', email: '', phone: '' });
    const [isPrimary, setIsPrimary] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setForm({ name: '', role: '', email: '', phone: '' });
            setIsPrimary(false);
        }
    }, [open]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error(t.contactDialog.nameRequired);
            return;
        }
        setSaving(true);
        try {
            await createContact(clientId, { ...form, isPrimary });
            toast.success(t.contactDialog.added);
            onOpenChange(false);
            onSaved();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.contactDialog.failed);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>{t.contactDialog.title}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="c-name">{t.contactDialog.name} *</Label>
                        <Input id="c-name" value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Camille Rousseau" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="c-role">{t.contactDialog.role}</Label>
                        <Input id="c-role" value={form.role}
                            onChange={e => setForm({ ...form, role: e.target.value })}
                            placeholder="Responsable logistique" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="c-email">{t.contactDialog.email}</Label>
                        <Input id="c-email" type="email" value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="c-phone">{t.contactDialog.phone}</Label>
                        <Input id="c-phone" value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <label htmlFor="c-primary" className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox id="c-primary" checked={isPrimary}
                            onCheckedChange={v => setIsPrimary(Boolean(v))} />
                        {t.contactDialog.isPrimary}
                    </label>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            {t.common.cancel}
                        </Button>
                        <Button type="submit" disabled={saving} className="bg-brand-500 text-ink-950 hover:bg-brand-400">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t.common.add}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
