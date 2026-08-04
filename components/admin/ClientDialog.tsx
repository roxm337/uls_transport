'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { CLIENT_STATUSES, SERVICE_OPTIONS, parseServices } from '@/lib/crm';
import { useLanguage } from '@/lib/i18n/context';
import {
    createClient, updateClient, fetchStaffOptions,
    type Client, type StaffOption,
} from '@/lib/services/clients';

/** Sentinel for "no account manager": Radix Select rejects an empty value. */
const NO_MANAGER = 'none';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Provide to edit; omit to create. */
    client?: Client | null;
    onSaved: () => void;
}

const EMPTY = {
    companyName: '', siret: '', vatNumber: '', contactName: '', email: '', phone: '',
    addressLine: '', postalCode: '', city: '', country: 'France',
    status: 'Prospect', paymentTerms: '', notes: '', accountManagerId: NO_MANAGER,
};

export function ClientDialog({ open, onOpenChange, client, onSaved }: Props) {
    const { t } = useLanguage();
    const isEdit = Boolean(client);
    const [form, setForm] = React.useState(EMPTY);
    const [services, setServices] = React.useState<string[]>([]);
    const [staff, setStaff] = React.useState<StaffOption[]>([]);
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;
        fetchStaffOptions().then(setStaff).catch(() => {
            // A picker that can't load is a missing field, not a failed save:
            // the rest of the form stays usable.
            toast.error(t.clients.staffLoadFailed);
        });
    }, [open, t]);

    // Seed the form when the dialog opens, or when it is pointed at a different
    // client. React's documented alternative to an effect for "reset state when
    // a prop changes": adjusting during render lets React throw away the
    // in-progress output and re-render immediately, where an effect would commit
    // one pass showing the previous client's values and then cascade a second.
    const seedFor = open ? (client?.id ?? 'new') : null;
    const [seededFor, setSeededFor] = React.useState<string | null>(null);
    if (seedFor !== seededFor) {
        setSeededFor(seedFor);
        if (!open) {
            // Closing only records the transition; the hidden form is left alone
            // so it is not rebuilt on the way out.
        } else if (client) {
            setForm({
                companyName: client.companyName ?? '',
                siret: client.siret ?? '',
                vatNumber: client.vatNumber ?? '',
                contactName: client.contactName ?? '',
                email: client.email ?? '',
                phone: client.phone ?? '',
                addressLine: client.addressLine ?? '',
                postalCode: client.postalCode ?? '',
                city: client.city ?? '',
                country: client.country ?? 'France',
                status: client.status ?? 'Prospect',
                paymentTerms: client.paymentTerms ?? '',
                notes: client.notes ?? '',
                accountManagerId: client.accountManagerId ?? NO_MANAGER,
            });
            setServices(parseServices(client.services));
            setNotificationsEnabled(Boolean(client.notificationsEnabled));
        } else {
            setForm(EMPTY);
            setServices([]);
            // Off for a new client: nobody is written to until someone says so.
            setNotificationsEnabled(false);
        }
    }

    const set = (key: keyof typeof EMPTY) => (value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const toggleService = (slug: string) =>
        setServices(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.companyName.trim()) {
            toast.error(t.clientDialog.companyRequired);
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                services,
                notificationsEnabled,
                // The sentinel is a UI concern; the column stores null.
                accountManagerId:
                    form.accountManagerId === NO_MANAGER ? null : form.accountManagerId,
            };
            if (isEdit && client) {
                await updateClient(client.id, payload);
                toast.success(t.clientDialog.updated);
            } else {
                await createClient(payload);
                toast.success(t.clientDialog.created);
            }
            onOpenChange(false);
            onSaved();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.clientDialog.saveFailed);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t.clientDialog.editTitle : t.clientDialog.createTitle}</DialogTitle>
                    <DialogDescription>
                        {t.clientDialog.description}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="companyName">{t.clientDialog.companyName} *</Label>
                            <Input
                                id="companyName"
                                value={form.companyName}
                                onChange={e => set('companyName')(e.target.value)}
                                placeholder="Transports Bernard"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="siret">{t.clientDialog.siret}</Label>
                            <Input id="siret" value={form.siret}
                                onChange={e => set('siret')(e.target.value)}
                                placeholder="812 345 678 00019" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="vatNumber">{t.clientDialog.vatNumber}</Label>
                            <Input id="vatNumber" value={form.vatNumber}
                                onChange={e => set('vatNumber')(e.target.value)}
                                placeholder="FR12812345678" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="contactName">{t.clientDialog.contactName}</Label>
                            <Input id="contactName" value={form.contactName}
                                onChange={e => set('contactName')(e.target.value)}
                                placeholder="Camille Rousseau" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">{t.clientDialog.phone}</Label>
                            <Input id="phone" value={form.phone}
                                onChange={e => set('phone')(e.target.value)}
                                placeholder="+33 1 69 21 00 00" />
                        </div>

                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="email">{t.clientDialog.email}</Label>
                            <Input id="email" type="email" value={form.email}
                                onChange={e => set('email')(e.target.value)}
                                placeholder="contact@transports-bernard.fr" />
                        </div>

                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="addressLine">{t.clientDialog.address}</Label>
                            <Input id="addressLine" value={form.addressLine}
                                onChange={e => set('addressLine')(e.target.value)}
                                placeholder="28 Avenue Paul Langevin" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="postalCode">{t.clientDialog.postalCode}</Label>
                            <Input id="postalCode" value={form.postalCode}
                                onChange={e => set('postalCode')(e.target.value)}
                                placeholder="91130" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="city">{t.clientDialog.city}</Label>
                            <Input id="city" value={form.city}
                                onChange={e => set('city')(e.target.value)}
                                placeholder="Ris-Orangis" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">{t.clientDialog.status}</Label>
                            <Select value={form.status} onValueChange={set('status')}>
                                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CLIENT_STATUSES.map(s => (
                                        <SelectItem key={s} value={s}>{t.crm.clientStatus[s] ?? s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="paymentTerms">{t.clientDialog.paymentTerms}</Label>
                            <Input id="paymentTerms" value={form.paymentTerms}
                                onChange={e => set('paymentTerms')(e.target.value)}
                                placeholder="30 jours fin de mois" />
                        </div>

                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="accountManagerId">{t.clientDialog.accountManager}</Label>
                            <Select
                                value={form.accountManagerId}
                                onValueChange={set('accountManagerId')}
                            >
                                <SelectTrigger id="accountManagerId">
                                    <SelectValue placeholder={t.clientDialog.noManager} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_MANAGER}>{t.clientDialog.noManager}</SelectItem>
                                    {staff.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>{t.clientDialog.services}</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {SERVICE_OPTIONS.map(opt => {
                                const checked = services.includes(opt.value);
                                return (
                                    <label
                                        key={opt.value}
                                        htmlFor={`svc-${opt.value}`}
                                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                            checked
                                                ? 'border-brand-300 bg-brand-50'
                                                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                        }`}
                                    >
                                        <Checkbox
                                            id={`svc-${opt.value}`}
                                            checked={checked}
                                            onCheckedChange={() => toggleService(opt.value)}
                                            className="mt-0.5"
                                        />
                                        <span className="text-sm font-medium text-ink-950">{opt.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* The only per-client messaging setting there is: the
                        credentials themselves belong to ULS and live in
                        Messagerie → Configuration. */}
                    <label
                        htmlFor="notificationsEnabled"
                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                            notificationsEnabled
                                ? 'border-sky-300 bg-sky-50'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                        <Checkbox
                            id="notificationsEnabled"
                            checked={notificationsEnabled}
                            onCheckedChange={v => setNotificationsEnabled(Boolean(v))}
                            className="mt-0.5"
                        />
                        <span className="text-sm">
                            <span className="font-medium text-ink-950">
                                {t.clientDialog.notificationsTitle}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                                {t.clientDialog.notificationsHint}
                            </span>
                        </span>
                    </label>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">{t.clientDialog.notes}</Label>
                        <textarea
                            id="notes"
                            value={form.notes}
                            onChange={e => set('notes')(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-ink-950 focus:ring-2 focus:ring-ink-950/10"
                            placeholder={t.clientDialog.notesPlaceholder}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline"
                            onClick={() => onOpenChange(false)} disabled={saving}>
                            {t.common.cancel}
                        </Button>
                        <Button type="submit" disabled={saving}
                            className="bg-brand-500 text-ink-950 hover:bg-brand-400">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? t.common.save : t.clientDialog.submitCreate}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
