import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getClientSession } from '@/lib/server/client-auth';
import { ClientClaimForm } from '@/components/client/ClientClaimForm';
import { Card, CardContent } from '@/components/ui/card';

export default async function NewClientClaimPage({ searchParams }: { searchParams: Promise<{ expedition?: string }> }) {
    const session = await getClientSession();
    if (!session) redirect('/espace-client/login');
    const query = await searchParams;
    const expeditions = await prisma.expedition.findMany({
        where: { clientId: session.clientId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, reference: true, pickupCity: true, deliveryCity: true },
        take: 100,
    });
    const initialExpeditionId = expeditions.some(item => item.id === query.expedition) ? query.expedition : '';

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <Link href="/espace-client/reclamations" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink-950"><ArrowLeft className="h-4 w-4" /> Retour aux litiges</Link>
            <header className="border-b border-ink-950/10 pb-6">
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">Ouverture de dossier</p>
                <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Que s’est-il passé ?</h1>
                <p className="mt-2 text-sm text-slate-500">Sélectionnez la nature du litige et joignez les éléments utiles à sa résolution.</p>
            </header>
            <Card className="overflow-hidden py-0">
                <div className="grid bg-ink-950 text-white sm:grid-cols-[15rem_1fr]">
                    <aside className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-ink-950"><ShieldCheck className="h-5 w-5" /></span>
                        <p className="mt-5 font-semibold">Un dossier traçable</p>
                        <p className="mt-2 text-xs leading-5 text-white/50">Votre demande reçoit une référence unique et reste consultable dans votre espace.</p>
                    </aside>
                    <CardContent className="bg-white p-5 text-ink-950 sm:p-7"><ClientClaimForm expeditions={expeditions} initialExpeditionId={initialExpeditionId} /></CardContent>
                </div>
            </Card>
        </div>
    );
}
