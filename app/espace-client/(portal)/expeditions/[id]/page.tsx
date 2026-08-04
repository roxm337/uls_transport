import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Box, CalendarDays, FileWarning, Mail, MapPin, Package, Scale, Thermometer, Truck } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getClientSession } from '@/lib/server/client-auth';
import { formatPortalDate, statusLabel } from '@/lib/client-portal';
import { serviceLabel } from '@/lib/crm';
import { BRAND } from '@/lib/brand';
import { RouteBand } from '@/components/client/RouteBand';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ClientExpeditionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getClientSession();
    if (!session) redirect('/espace-client/login');
    const { id } = await params;

    const expedition = await prisma.expedition.findFirst({
        where: { id, clientId: session.clientId },
        include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!expedition) notFound();

    const addressPickup = [expedition.pickupAddress, [expedition.pickupPostalCode, expedition.pickupCity].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const addressDelivery = [expedition.deliveryAddress, [expedition.deliveryPostalCode, expedition.deliveryCity].filter(Boolean).join(' ')].filter(Boolean).join(', ');

    return (
        <div className="space-y-7">
            <Link href="/espace-client/expeditions" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink-950"><ArrowLeft className="h-4 w-4" /> Retour aux expéditions</Link>
            <RouteBand reference={expedition.reference} status={expedition.status} pickupCity={expedition.pickupCity} deliveryCity={expedition.deliveryCity} service={serviceLabel(expedition.service)} />

            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
                <div className="space-y-5">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Trajet</CardTitle></CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <Info icon={MapPin} label="Adresse d’enlèvement" value={addressPickup || 'À confirmer'} detail={formatPortalDate(expedition.pickupDate)} />
                            <Info icon={Package} label="Adresse de livraison" value={addressDelivery || 'À confirmer'} detail={formatPortalDate(expedition.deliveryDate)} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Marchandise et véhicule</CardTitle></CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <Info icon={Box} label="Marchandise" value={expedition.goodsDescription || 'Non précisée'} />
                            <Info icon={Package} label="Colis" value={expedition.packages === null ? 'Non précisé' : String(expedition.packages)} />
                            <Info icon={Scale} label="Poids" value={expedition.weightKg === null ? 'Non précisé' : `${expedition.weightKg} kg`} />
                            <Info icon={Truck} label="Véhicule" value={expedition.vehicleType || 'À confirmer'} />
                            {expedition.temperature && <Info icon={Thermometer} label="Température" value={expedition.temperature} />}
                        </CardContent>
                    </Card>
                </div>

                <Card className="h-fit">
                    <CardHeader><CardTitle className="text-lg">Étapes du transport</CardTitle></CardHeader>
                    <CardContent>
                        <ol className="relative border-l border-ink-950/10 pl-6">
                            {(expedition.events.length > 0 ? expedition.events : [{ id: 'created', status: expedition.status, createdAt: expedition.createdAt }]).map((event, index, all) => (
                                <li key={event.id} className="relative pb-7 last:pb-0">
                                    <span className={`absolute -left-[1.9rem] top-0.5 h-3 w-3 rounded-full border-2 border-white ${index === all.length - 1 ? 'bg-brand-500 ring-4 ring-brand-500/15' : 'bg-ink-950'}`} />
                                    <p className="text-sm font-semibold">{event.status ? statusLabel(event.status) : 'Mise à jour'}</p>
                                    <time className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="h-3.5 w-3.5" /> {formatPortalDate(event.createdAt, true)}</time>
                                </li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-brand-300 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold">Une question sur cette expédition ?</p><p className="text-sm text-slate-600">Indiquez la référence {expedition.reference} à notre équipe.</p></div>
                <div className="flex flex-wrap items-center gap-4">
                    <Link href={`/espace-client/reclamations/nouvelle?expedition=${expedition.id}`} className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"><FileWarning className="h-4 w-4" /> Ouvrir une réclamation</Link>
                    <a href={`mailto:${BRAND.contact.operationsEmail}?subject=${encodeURIComponent(`Expédition ${expedition.reference}`)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:underline"><Mail className="h-4 w-4" /> E-mail</a>
                </div>
            </div>
        </div>
    );
}

function Info({ icon: Icon, label, value, detail }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; detail?: string }) {
    return <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-950/[0.055]"><Icon className="h-4 w-4 text-ink-700" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 text-sm font-medium leading-5">{value}</p>{detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}</div></div>;
}
