import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CircleDollarSign, FilePlus2, FileWarning, FolderOpen } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getClientSession } from '@/lib/server/client-auth';
import { formatPortalDate } from '@/lib/client-portal';
import {
    CLAIM_STATUS_STYLES,
    OPEN_CLAIM_STATUSES,
    claimStatusLabel,
    claimIssueTypeLabel,
    claimTypeLabel,
    formatClaimAmount,
    isClaimStatus,
} from '@/lib/claims';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default async function ClientClaimsPage() {
    const session = await getClientSession();
    if (!session) redirect('/espace-client/login');

    const [claims, openCount, refundCount] = await Promise.all([
        prisma.clientClaim.findMany({
            where: { clientId: session.clientId },
            orderBy: { createdAt: 'desc' },
            include: { expedition: { select: { reference: true } } },
            take: 100,
        }),
        prisma.clientClaim.count({ where: { clientId: session.clientId, status: { in: OPEN_CLAIM_STATUSES } } }),
        prisma.clientClaim.count({ where: { clientId: session.clientId, type: 'REMBOURSEMENT' } }),
    ]);

    return (
        <div className="space-y-7">
            <header className="flex flex-col gap-5 border-b border-ink-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">Service après transport</p>
                    <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Mes litiges</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500">Signalez un retard, une avarie, une casse ou une perte et suivez sa résolution.</p>
                </div>
                <Button asChild variant="signal"><Link href="/espace-client/reclamations/nouvelle"><FilePlus2 className="h-4 w-4" /> Nouvelle demande</Link></Button>
            </header>

            <section className="grid gap-3 sm:grid-cols-3" aria-label="Résumé des dossiers">
                {[
                    { label: 'Dossiers', value: claims.length, icon: FolderOpen },
                    { label: 'En traitement', value: openCount, icon: FileWarning },
                    { label: 'Remboursements', value: refundCount, icon: CircleDollarSign },
                ].map(item => (
                    <Card key={item.label} className="py-0"><CardContent className="flex min-h-24 items-center gap-4 p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-950 text-brand-500"><item.icon className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p><p className="font-mono text-2xl font-semibold tabular-nums">{item.value}</p></div></CardContent></Card>
                ))}
            </section>

            {claims.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-ink-950/15 bg-white/60 p-10 text-center">
                    <FileWarning className="mx-auto h-8 w-8 text-slate-300" />
                    <h2 className="mt-3 font-semibold">Aucun dossier ouvert</h2>
                    <p className="mt-1 text-sm text-slate-500">Une nouvelle réclamation recevra immédiatement une référence de suivi.</p>
                    <Button asChild variant="outline" className="mt-5"><Link href="/espace-client/reclamations/nouvelle">Créer une demande</Link></Button>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {claims.map(claim => {
                        const statusStyle = isClaimStatus(claim.status) ? CLAIM_STATUS_STYLES[claim.status] : '';
                        return (
                            <Link key={claim.id} href={`/espace-client/reclamations/${claim.id}`} className="group overflow-hidden rounded-2xl border border-ink-950/[0.08] bg-white shadow-[0_10px_30px_rgba(10,10,10,.035)] transition-transform hover:-translate-y-0.5">
                                <div className="flex min-h-44">
                                    <span className={`w-1.5 shrink-0 ${claim.type === 'REMBOURSEMENT' ? 'bg-sky-500' : 'bg-brand-500'}`} />
                                    <div className="flex min-w-0 flex-1 flex-col p-5">
                                        <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{claim.reference}</p><p className="mt-1 text-xs font-semibold text-slate-500">{claimIssueTypeLabel(claim.issueType)} · {claimTypeLabel(claim.type)}</p></div><Badge variant="outline" className={statusStyle}>{claimStatusLabel(claim.status)}</Badge></div>
                                        <h2 className="mt-5 line-clamp-2 font-semibold tracking-[-0.015em]">{claim.subject}</h2>
                                        <div className="mt-auto flex items-end justify-between gap-4 pt-5 text-xs text-slate-400"><div><p>{claim.expedition?.reference || 'Demande générale'}</p>{claim.requestedAmount !== null && <p className="mt-1 font-semibold text-sky-700">{formatClaimAmount(Number(claim.requestedAmount))}</p>}</div><div className="flex items-center gap-2"><time>{formatPortalDate(claim.createdAt)}</time><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div></div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
