import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, CalendarDays, CircleDollarSign, ExternalLink, FileText, MessageSquareText, PackageSearch, Paperclip } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getClientSession } from '@/lib/server/client-auth';
import { formatPortalDate } from '@/lib/client-portal';
import { claimIssueTypeLabel, claimStatusLabel, claimTypeLabel, formatClaimAmount } from '@/lib/claims';
import { ClaimStatusRail } from '@/components/client/ClaimStatusRail';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ClientClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getClientSession();
    if (!session) redirect('/espace-client/login');
    const { id } = await params;
    const claim = await prisma.clientClaim.findFirst({
        where: { id, clientId: session.clientId },
        include: {
            expedition: { select: { id: true, reference: true, pickupCity: true, deliveryCity: true } },
            documents: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!claim) notFound();

    return (
        <div className="space-y-6">
            <Link href="/espace-client/reclamations" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink-950"><ArrowLeft className="h-4 w-4" /> Retour aux litiges</Link>
            <section className="overflow-hidden rounded-[1.4rem] bg-ink-950 text-white shadow-[0_24px_70px_rgba(10,10,10,.16)]">
                <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_24rem] lg:items-end">
                    <div><div className="flex flex-wrap items-center gap-3"><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">{claim.reference}</p><Badge className="border-brand-500/40 bg-brand-500 text-ink-950">{claimIssueTypeLabel(claim.issueType)}</Badge><Badge className="border-white/15 bg-white/10 text-white">{claimTypeLabel(claim.type)}</Badge></div><h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{claim.subject}</h1><p className="mt-3 flex items-center gap-2 text-xs text-white/45"><CalendarDays className="h-3.5 w-3.5" /> Ouvert le {formatPortalDate(claim.createdAt, true)}</p></div>
                    <div><p className="mb-4 text-right text-xs font-semibold text-brand-500">{claimStatusLabel(claim.status)}</p><ClaimStatusRail status={claim.status} /></div>
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
                <div className="space-y-5">
                    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-slate-400" /> Votre demande</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{claim.description}</p></CardContent></Card>
                    {claim.documents.length > 0 && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Paperclip className="h-5 w-5 text-slate-400" /> Documents justificatifs</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{claim.documents.map(document => <a key={document.id} href={`/api/client/claims/${claim.id}/documents/${document.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-ink-950/[0.08] p-3 transition-colors hover:border-ink-950/20 hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-950 text-brand-500"><FileText className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{document.originalName}</span><span className="text-[10px] text-slate-400">{(document.size / 1024 / 1024).toFixed(1)} Mo</span></span></a>)}</CardContent></Card>}
                    <Card className={claim.publicResponse ? 'border-brand-300 bg-brand-50/50' : ''}><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquareText className="h-5 w-5 text-slate-400" /> Réponse ULS</CardTitle></CardHeader><CardContent>{claim.publicResponse ? <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{claim.publicResponse}</p> : <p className="text-sm text-slate-500">L’équipe analyse votre dossier. Sa réponse apparaîtra ici.</p>}</CardContent></Card>
                </div>
                <aside className="space-y-4">
                    {claim.expedition && <Card className="py-0"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Expédition liée</p><p className="mt-2 font-mono text-sm font-semibold">{claim.expedition.reference}</p><p className="mt-2 text-xs text-slate-500">{claim.expedition.pickupCity || '?'} → {claim.expedition.deliveryCity || '?'}</p><Link href={`/espace-client/expeditions/${claim.expedition.id}`} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold hover:underline"><PackageSearch className="h-4 w-4" /> Voir l’expédition <ExternalLink className="h-3 w-3" /></Link></CardContent></Card>}
                    {claim.requestedAmount !== null && <Card className="border-sky-200 bg-sky-50 py-0"><CardContent className="p-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white"><CircleDollarSign className="h-4 w-4" /></span><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700/60">Montant demandé</p><p className="mt-1 font-mono text-2xl font-semibold text-sky-950">{formatClaimAmount(Number(claim.requestedAmount))}</p></CardContent></Card>}
                    <Card className="py-0"><CardContent className="p-5 text-xs leading-5 text-slate-500"><p className="font-semibold text-ink-950">Dernière mise à jour</p><p className="mt-1">{formatPortalDate(claim.updatedAt, true)}</p>{claim.resolvedAt && <p className="mt-3">Clôturé le {formatPortalDate(claim.resolvedAt, true)}</p>}</CardContent></Card>
                </aside>
            </div>
        </div>
    );
}
