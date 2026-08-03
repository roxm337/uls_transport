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
import { SERVICE_OPTIONS } from '@/lib/crm';
import { useLanguage } from '@/lib/i18n/context';
import {
    createExpedition, updateExpedition, fetchClientOptions,
    type Expedition, type ClientOption, type ExpeditionInput,
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
    const { t } = useLanguage();
    const isEdit = Boolean(expedition);
    const [form, setForm] = React.useState(EMPTY);
    const [clients, setClients] = React.useState<ClientOption[]>([]);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;
        fetchClientOptions().then(setClients).catch(() => {
            toast.error(t.expeditionDialog.clientsLoadFailed);
        });
    }, [open, t]);

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
        if (!form.clientId) return toast.error(t.expeditionDialog.clientRequired);
        if (!form.service) return toast.error(t.expeditionDialog.serviceRequired);
        if (form.pickupDate && form.deliveryDate && form.deliveryDate < form.pickupDate) {
            return toast.error("La date de livraison ne peut pas précéder la date d'enlèvement.");
        }

        setSaving(true);
        try {
            const payload: ExpeditionInput = {
                ...form,
                packages: form.packages === '' ? null : Number(form.packages),
                weightKg: form.weightKg === '' ? null : Number(form.weightKg),
                priceHt: form.priceHt === '' ? null : Number(form.priceHt),
                temperature: isRefrigerated ? form.temperature : null,
            };

            if (isEdit && expedition) {
                await updateExpedition(expedition.id, payload);
                toast.success(t.expeditionDialog.updated);
            } else {
                const { expedition: created } = await createExpedition(payload);
                toast.success(t.expeditionDialog.created(created.reference));
            }
            onOpenChange(false);
            onSaved();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.expeditionDialog.saveFailed);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t.expeditionDialog.editTitle(expedition?.reference ?? '') : t.expeditionDialog.createTitle}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? t.expeditionDialog.editDescription
                            : t.expeditionDialog.createDescription}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t.expeditionDialog.client} *</Label>
                            <Select value={form.clientId} onValueChange={set('clientId')}>
                                <SelectTrigger><SelectValue placeholder={t.expeditionDialog.choose} /></SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.expeditionDialog.service} *</Label>
                            <Select value={form.service} onValueChange={set('service')}>
                                <SelectTrigger><SelectValue placeholder={t.expeditionDialog.choose} /></SelectTrigger>
                                <SelectContent>
                                    {SERVICE_OPTIONS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Fieldset title={t.expeditionDialog.pickup}>
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="pu-addr">{t.expeditionDialog.address}</Label>
                                <Input id="pu-addr" value={form.pickupAddress}
                                    onChange={e => set('pickupAddress')(e.target.value)}
                                    placeholder="12 rue des Docks" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pu-cp">{t.expeditionDialog.postalCode}</Label>
                                <Input id="pu-cp" value={form.pickupPostalCode}
                                    onChange={e => set('pickupPostalCode')(e.target.value)} placeholder="94150" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pu-city">{t.expeditionDialog.city}</Label>
                                <Input id="pu-city" value={form.pickupCity}
                                    onChange={e => set('pickupCity')(e.target.value)} placeholder="Rungis" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pu-date">{t.expeditionDialog.date}</Label>
                                <Input id="pu-date" type="date" value={form.pickupDate}
                                    max={form.deliveryDate || undefined}
                                    onChange={e => set('pickupDate')(e.target.value)} />
                            </div>
                        </div>
                    </Fieldset>

                    <Fieldset title={t.expeditionDialog.delivery}>
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="dl-addr">{t.expeditionDialog.address}</Label>
                                <Input id="dl-addr" value={form.deliveryAddress}
                                    onChange={e => set('deliveryAddress')(e.target.value)}
                                    placeholder="5 avenue de la Gare" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dl-cp">{t.expeditionDialog.postalCode}</Label>
                                <Input id="dl-cp" value={form.deliveryPostalCode}
                                    onChange={e => set('deliveryPostalCode')(e.target.value)} placeholder="69007" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dl-city">{t.expeditionDialog.city}</Label>
                                <Input id="dl-city" value={form.deliveryCity}
                                    onChange={e => set('deliveryCity')(e.target.value)} placeholder="Lyon" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dl-date">{t.expeditionDialog.date}</Label>
                                <Input id="dl-date" type="date" value={form.deliveryDate}
                                    min={form.pickupDate || undefined}
                                    onChange={e => set('deliveryDate')(e.target.value)} />
                            </div>
                        </div>
                    </Fieldset>

                    <Fieldset title={t.expeditionDialog.goods}>
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="grid gap-2 sm:col-span-4">
                                <Label htmlFor="goods">{t.expeditionDialog.description}</Label>
                                <Input id="goods" value={form.goodsDescription}
                                    onChange={e => set('goodsDescription')(e.target.value)}
                                    placeholder="3 palettes EUR filmées, non gerbables" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pkg">{t.expeditionDialog.packages}</Label>
                                <Input id="pkg" type="number" min="0" value={form.packages}
                                    onChange={e => set('packages')(e.target.value)} placeholder="3" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="wt">{t.expeditionDialog.weight}</Label>
                                <Input id="wt" type="number" min="0" step="0.1" value={form.weightKg}
                                    onChange={e => set('weightKg')(e.target.value)} placeholder="850" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="veh">{t.expeditionDialog.vehicle}</Label>
                                <Input id="veh" value={form.vehicleType}
                                    onChange={e => set('vehicleType')(e.target.value)}
                                    placeholder="Porteur 19 t hayon" />
                            </div>
                            {isRefrigerated && (
                                <div className="grid gap-2">
                                    <Label htmlFor="temp">{t.expeditionDialog.temperature}</Label>
                                    <Input id="temp" value={form.temperature}
                                        onChange={e => set('temperature')(e.target.value)}
                                        placeholder="2 à 4 °C" />
                                </div>
                            )}
                        </div>
                    </Fieldset>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="price">{t.expeditionDialog.price}</Label>
                            <Input id="price" type="number" min="0" step="0.01" value={form.priceHt}
                                onChange={e => set('priceHt')(e.target.value)} placeholder="480.00" />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="notes">{t.expeditionDialog.notes}</Label>
                            <Input id="notes" value={form.notes}
                                onChange={e => set('notes')(e.target.value)}
                                placeholder="Prise de RDV obligatoire au quai" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline"
                            onClick={() => onOpenChange(false)} disabled={saving}>
                            {t.common.cancel}
                        </Button>
                        <Button type="submit" disabled={saving}
                            className="bg-brand-500 text-ink-950 hover:bg-brand-400">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? t.common.save : t.expeditionDialog.submitCreate}
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
