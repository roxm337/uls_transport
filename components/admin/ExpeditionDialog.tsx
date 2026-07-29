'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { EXPEDITION_STATUSES, SERVICE_OPTIONS } from '@/lib/crm';
import {
    createExpedition, updateExpedition, fetchClientOptions,
    type Expedition, type ClientOption,
} from '@/lib/services/clients';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expedition?: Expedition | null;
    /** Pre-select a client (e.g. when opened from a client page). */
    defaultClientId?: string;
    onSaved: () => void;
}

const EMPTY = {
    clientId: '', service: '', status: 'Demandee',
    pickupAddress: '', pickupPostalCode: '', pickupCity: '', pickupDate: '',
    deliveryAddress: '', deliveryPostalCode: '', deliveryCity: '', deliveryDate: '',
    goodsDescription: '', packages: '', weightKg: '', temperature: '', vehicleType: '',
    priceHt: '', notes: '',
};

/** yyyy-mm-dd for <input type="date">, or '' when absent. */
function toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function ExpeditionDialog({
    open, onOpenChange, expedition, defaultClientId, onSaved,
}: Props) {
    const isEdit = Boolean(expedition);
    const [form, setForm] = React.useState(EMPTY);
    const [clients, setClients] = React.useState<ClientOption[]>([]);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;
        fetchClientOptions().then(setClients).catch(() => {
            toast.error('Impossible de charger la liste des clients.');
        });
    }, [open]);

    React.useEffect(() => {
        if (!open) return;
        if (expedition) {
            setForm({
                clientId: expedition.clientId,
                service: expedition.service,
                status: expedition.status,
                pickupAddress: expedition.pickupAddress ?? '',
                pickupPostalCode: expedition.pickupPostalCode ?? '',
                pickupCity: expedition.pickupCity ?? '',
                pickupDate: toDateInput(expedition.pickupDate),
                deliveryAddress: expedition.deliveryAddress ?? '',
                deliveryPostalCode: expedition.deliveryPostalCode ?? '',
                deliveryCity: expedition.deliveryCity ?? '',
                deliveryDate: toDateInput(expedition.deliveryDate),
                goodsDescription: expedition.goodsDescription ?? '',
                packages: expedition.packages?.toString() ?? '',
                weightKg: expedition.weightKg?.toString() ?? '',
                temperature: expedition.temperature ?? '',
                vehicleType: expedition.vehicleType ?? '',
                priceHt: expedition.priceHt?.toString() ?? '',
                notes: expedition.notes ?? '',
            });
        } else {
            setForm({ ...EMPTY, clientId: defaultClientId ?? '' });
        }
    }, [open, expedition, defaultClientId]);

    const set = (key: keyof typeof EMPTY) => (value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    // The temperature field only makes sense for refrigerated transport.
    const isRefrigerated = form.service === 'transport-frigorifique';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.clientId) return toast.error('Sélectionnez un client.');
        if (!form.service) return toast.error('Sélectionnez un service ULS.');

        setSaving(true);
        try {
            const payload: any = {
                ...form,
                packages: form.packages === '' ? null : Number(form.packages),
                weightKg: form.weightKg === '' ? null : Number(form.weightKg),
                priceHt: form.priceHt === '' ? null : Number(form.priceHt),
                temperature: isRefrigerated ? form.temperature : null,
            };

            if (isEdit && expedition) {
                await updateExpedition(expedition.id, payload);
                toast.success('Expédition mise à jour.');
            } else {
                const { expedition: created } = await createExpedition(payload);
                toast.success(`Expédition ${created.reference} créée.`);
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
            <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? `Expédition ${expedition?.reference}` : 'Nouvelle expédition'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Mettre à jour le transport et son statut.'
                            : 'La référence ULS est attribuée automatiquement.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2 sm:col-span-1">
                            <Label>Client *</Label>
                            <Select value={form.clientId} onValueChange={set('clientId')}>
                                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2 sm:col-span-1">
                            <Label>Service ULS *</Label>
                            <Select value={form.service} onValueChange={set('service')}>
                                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                                <SelectContent>
                                    {SERVICE_OPTIONS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2 sm:col-span-1">
                            <Label>Statut</Label>
                            <Select value={form.status} onValueChange={set('status')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {EXPEDITION_STATUSES.map(s => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Fieldset title="Enlèvement">
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="pu-addr">Adresse</Label>
                                <Input id="pu-addr" value={form.pickupAddress}
                                    onChange={e => set('pickupAddress')(e.target.value)}
                                    placeholder="12 rue des Docks" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pu-cp">Code postal</Label>
                                <Input id="pu-cp" value={form.pickupPostalCode}
                                    onChange={e => set('pickupPostalCode')(e.target.value)} placeholder="94150" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pu-city">Ville</Label>
                                <Input id="pu-city" value={form.pickupCity}
                                    onChange={e => set('pickupCity')(e.target.value)} placeholder="Rungis" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pu-date">Date</Label>
                                <Input id="pu-date" type="date" value={form.pickupDate}
                                    onChange={e => set('pickupDate')(e.target.value)} />
                            </div>
                        </div>
                    </Fieldset>

                    <Fieldset title="Livraison">
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="dl-addr">Adresse</Label>
                                <Input id="dl-addr" value={form.deliveryAddress}
                                    onChange={e => set('deliveryAddress')(e.target.value)}
                                    placeholder="5 avenue de la Gare" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dl-cp">Code postal</Label>
                                <Input id="dl-cp" value={form.deliveryPostalCode}
                                    onChange={e => set('deliveryPostalCode')(e.target.value)} placeholder="69007" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dl-city">Ville</Label>
                                <Input id="dl-city" value={form.deliveryCity}
                                    onChange={e => set('deliveryCity')(e.target.value)} placeholder="Lyon" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dl-date">Date</Label>
                                <Input id="dl-date" type="date" value={form.deliveryDate}
                                    onChange={e => set('deliveryDate')(e.target.value)} />
                            </div>
                        </div>
                    </Fieldset>

                    <Fieldset title="Marchandise">
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="grid gap-2 sm:col-span-4">
                                <Label htmlFor="goods">Description</Label>
                                <Input id="goods" value={form.goodsDescription}
                                    onChange={e => set('goodsDescription')(e.target.value)}
                                    placeholder="3 palettes EUR filmées, non gerbables" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pkg">Colis / palettes</Label>
                                <Input id="pkg" type="number" min="0" value={form.packages}
                                    onChange={e => set('packages')(e.target.value)} placeholder="3" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="wt">Poids (kg)</Label>
                                <Input id="wt" type="number" min="0" step="0.1" value={form.weightKg}
                                    onChange={e => set('weightKg')(e.target.value)} placeholder="850" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="veh">Véhicule</Label>
                                <Input id="veh" value={form.vehicleType}
                                    onChange={e => set('vehicleType')(e.target.value)}
                                    placeholder="Porteur 19 t hayon" />
                            </div>
                            {isRefrigerated && (
                                <div className="grid gap-2">
                                    <Label htmlFor="temp">Température</Label>
                                    <Input id="temp" value={form.temperature}
                                        onChange={e => set('temperature')(e.target.value)}
                                        placeholder="2 à 4 °C" />
                                </div>
                            )}
                        </div>
                    </Fieldset>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="price">Prix HT (€)</Label>
                            <Input id="price" type="number" min="0" step="0.01" value={form.priceHt}
                                onChange={e => set('priceHt')(e.target.value)} placeholder="480.00" />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="notes">Notes d&apos;exploitation</Label>
                            <Input id="notes" value={form.notes}
                                onChange={e => set('notes')(e.target.value)}
                                placeholder="Prise de RDV obligatoire au quai" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline"
                            onClick={() => onOpenChange(false)} disabled={saving}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={saving}
                            className="bg-brand-500 text-ink-950 hover:bg-brand-400">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Enregistrer' : 'Créer l’expédition'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-slate-200 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                {title}
            </p>
            {children}
        </div>
    );
}
