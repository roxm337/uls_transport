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
    const isEdit = Boolean(client);
    const [form, setForm] = React.useState(EMPTY);
    const [services, setServices] = React.useState<string[]>([]);
    const [staff, setStaff] = React.useState<StaffOption[]>([]);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;
        fetchStaffOptions().then(setStaff).catch(() => {
            // A picker that can't load is a missing field, not a failed save:
            // the rest of the form stays usable.
            toast.error("Impossible de charger l'équipe.");
        });
    }, [open]);

    React.useEffect(() => {
        if (!open) return;
        if (client) {
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
        } else {
            setForm(EMPTY);
            setServices([]);
        }
    }, [open, client]);

    const set = (key: keyof typeof EMPTY) => (value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const toggleService = (slug: string) =>
        setServices(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.companyName.trim()) {
            toast.error('La raison sociale est obligatoire.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                services,
                // The sentinel is a UI concern; the column stores null.
                accountManagerId:
                    form.accountManagerId === NO_MANAGER ? null : form.accountManagerId,
            };
            if (isEdit && client) {
                await updateClient(client.id, payload);
                toast.success('Client mis à jour.');
            } else {
                await createClient(payload);
                toast.success('Client créé.');
            }
            onOpenChange(false);
            onSaved();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Enregistrement impossible.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
                    <DialogDescription>
                        Fiche du donneur d&apos;ordre et services ULS souscrits.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="companyName">Raison sociale *</Label>
                            <Input
                                id="companyName"
                                value={form.companyName}
                                onChange={e => set('companyName')(e.target.value)}
                                placeholder="Transports Bernard"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="siret">SIRET</Label>
                            <Input id="siret" value={form.siret}
                                onChange={e => set('siret')(e.target.value)}
                                placeholder="812 345 678 00019" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="vatNumber">N° TVA</Label>
                            <Input id="vatNumber" value={form.vatNumber}
                                onChange={e => set('vatNumber')(e.target.value)}
                                placeholder="FR12812345678" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="contactName">Contact principal</Label>
                            <Input id="contactName" value={form.contactName}
                                onChange={e => set('contactName')(e.target.value)}
                                placeholder="Camille Rousseau" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input id="phone" value={form.phone}
                                onChange={e => set('phone')(e.target.value)}
                                placeholder="+33 1 69 21 00 00" />
                        </div>

                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" type="email" value={form.email}
                                onChange={e => set('email')(e.target.value)}
                                placeholder="contact@transports-bernard.fr" />
                        </div>

                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="addressLine">Adresse</Label>
                            <Input id="addressLine" value={form.addressLine}
                                onChange={e => set('addressLine')(e.target.value)}
                                placeholder="28 Avenue Paul Langevin" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="postalCode">Code postal</Label>
                            <Input id="postalCode" value={form.postalCode}
                                onChange={e => set('postalCode')(e.target.value)}
                                placeholder="91130" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="city">Ville</Label>
                            <Input id="city" value={form.city}
                                onChange={e => set('city')(e.target.value)}
                                placeholder="Ris-Orangis" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">Statut</Label>
                            <Select value={form.status} onValueChange={set('status')}>
                                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CLIENT_STATUSES.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="paymentTerms">Conditions de règlement</Label>
                            <Input id="paymentTerms" value={form.paymentTerms}
                                onChange={e => set('paymentTerms')(e.target.value)}
                                placeholder="30 jours fin de mois" />
                        </div>

                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="accountManagerId">Chargé de compte</Label>
                            <Select
                                value={form.accountManagerId}
                                onValueChange={set('accountManagerId')}
                            >
                                <SelectTrigger id="accountManagerId">
                                    <SelectValue placeholder="Non attribué" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_MANAGER}>Non attribué</SelectItem>
                                    {staff.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Services ULS souscrits</Label>
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

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <textarea
                            id="notes"
                            value={form.notes}
                            onChange={e => set('notes')(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-ink-950 focus:ring-2 focus:ring-ink-950/10"
                            placeholder="Contraintes d'accès, horaires de quai, matériel requis…"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline"
                            onClick={() => onOpenChange(false)} disabled={saving}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={saving}
                            className="bg-brand-500 text-ink-950 hover:bg-brand-400">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Enregistrer' : 'Créer le client'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
