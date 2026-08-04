import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, ClipboardList, Clock3, PackageSearch, Truck } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getClientSession } from '@/lib/server/client-auth';
import { ACTIVE_EXPEDITION_STATUSES, formatPortalDate, statusLabel } from '@/lib/client-portal';
import { serviceLabel } from '@/lib/crm';
import { RouteBand } from '@/components/client/RouteBand';
import { Card, CardContent } from '@/components/ui/card';
import { OPEN_CLAIM_STATUSES } from '@/lib/claims';

export default async function ClientDashboardPage() {
    const session = await getClientSession();
    if (!session) redirect('/espace-client/login');

    const [active, recent, total, activeCount, delivered, openClaims] = await Promise.all([
        prisma.expedition.findFirst({
            where: { clientId: session.clientId, status: { in: ACTIVE_EXPEDITION_STATUSES } },
            orderBy: [{ pickupDate: 'desc' }, { createdAt: 'desc' }],
        }),
        prisma.expedition.findMany({
            where: { clientId: session.clientId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
        prisma.expedition.count({ where: { clientId: session.clientId } }),
        prisma.expedition.count({ where: { clientId: session.clientId, status: { in: ACTIVE_EXPEDITION_STATUSES } } }),
        prisma.expedition.count({ where: { clientId: session.clientId, status: 'Livree' } }),
        prisma.clientClaim.count({ where: { clientId: session.clientId, status: { in: OPEN_CLAIM_STATUSES } } }),
    ]);

    const firstName = session.contactName?.trim().split(/\s+/)[0];

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 border-b border-ink-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">Tableau de suivi</p>
                    <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                        Bonjour{firstName ? ` ${firstName}` : ''}.
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">Voici la situation de vos transports avec ULS.</p>
                </div>
                <Link href="/espace-client/expeditions" className="inline-flex items-center gap-2 text-sm font-semibold hover:underline">
                    Voir toutes les expéditions <ArrowUpRight className="h-4 w-4" />
                </Link>
            </header>

            <section aria-labelledby="active-shipment-title">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 id="active-shipment-title" className="text-lg font-semibold tracking-[-0.02em]">Transport à suivre</h2>
                    {active && <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Mise à jour opérationnelle</span>}
                </div>
                {active ? (
                    <RouteBand id={active.id} reference={active.reference} status={active.status} pickupCity={active.pickupCity} deliveryCity={active.deliveryCity} service={serviceLabel(active.service)} />
                ) : (
                    <div className="rounded-[1.4rem] border border-dashed border-ink-950/15 bg-white/60 p-8 text-center">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                        <h3 className="mt-3 font-semibold">Aucun transport en cours</h3>
                        <p className="mt-1 text-sm text-slate-500">Vos prochaines expéditions apparaîtront ici dès leur création.</p>
                    </div>
                )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Résumé de votre activité">
                {[
                    { label: 'En cours', value: activeCount, icon: Truck, detail: 'À suivre actuellement' },
                    { label: 'Livrées', value: delivered, icon: CheckCircle2, detail: 'Historique terminé' },
                    { label: 'Total', value: total, icon: PackageSearch, detail: 'Toutes vos demandes' },
                    { label: 'Dossiers ouverts', value: openClaims, icon: ClipboardList, detail: 'Réclamations en traitement' },
                ].map(item => (
                    <Card key={item.label} className="py-0">
                        <CardContent className="flex min-h-28 items-center gap-4 p-5">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-950 text-brand-500"><item.icon className="h-5 w-5" /></span>
                            <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{item.label}</p><p className="font-mono text-2xl font-semibold tabular-nums">{item.value}</p><p className="text-[11px] text-slate-400">{item.detail}</p></div>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <section>
                <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-0.02em]">Activité récente</h2><Clock3 className="h-4 w-4 text-slate-300" /></div>
                <div className="overflow-hidden rounded-2xl border border-ink-950/[0.08] bg-white shadow-[0_12px_36px_rgba(10,10,10,.035)]">
                    {recent.length === 0 ? <p className="p-6 text-sm text-slate-500">Aucune expédition enregistrée.</p> : (
                        <ul className="divide-y divide-ink-950/[0.07]">
                            {recent.map(expedition => (
                                <li key={expedition.id}>
                                    <Link href={`/espace-client/expeditions/${expedition.id}`} className="grid gap-2 p-4 transition-colors hover:bg-brand-50/60 sm:grid-cols-[9rem_1fr_9rem_7rem] sm:items-center sm:gap-4">
                                        <span className="font-mono text-xs font-semibold">{expedition.reference}</span>
                                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{expedition.pickupCity || 'Départ à confirmer'} → {expedition.deliveryCity || 'Arrivée à confirmer'}</span><span className="block truncate text-[11px] text-slate-400">{serviceLabel(expedition.service)}</span></span>
                                        <span className="text-xs font-medium text-slate-600">{statusLabel(expedition.status)}</span>
                                        <time className="text-xs text-slate-400 sm:text-right">{formatPortalDate(expedition.createdAt)}</time>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
        </div>
    );
}
