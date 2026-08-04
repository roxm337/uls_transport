import Link from 'next/link';
import { ArrowRight, Check, CircleDot, MapPin, PackageCheck } from 'lucide-react';
import { CLIENT_STATUS_STEPS, statusLabel, statusProgress } from '@/lib/client-portal';
import { cn } from '@/lib/utils';

interface RouteBandProps {
    id?: string;
    reference: string;
    status: string;
    pickupCity?: string | null;
    deliveryCity?: string | null;
    service?: string;
    compact?: boolean;
}

export function RouteBand({
    id,
    reference,
    status,
    pickupCity,
    deliveryCity,
    service,
    compact = false,
}: RouteBandProps) {
    const progress = statusProgress(status);
    const cancelled = status === 'Annulee';
    const content = (
        <div className={cn(
            'route-grid group relative overflow-hidden rounded-[1.4rem] bg-ink-950 text-white shadow-[0_22px_60px_rgba(10,10,10,.16)]',
            compact ? 'p-5' : 'p-6 sm:p-8',
        )}>
            <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-brand-500/[0.09] blur-3xl" />
            <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500">
                            {reference}
                        </p>
                        {service && <p className="mt-1 text-xs text-white/45">{service}</p>}
                    </div>
                    <span className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
                        cancelled
                            ? 'border-red-300/25 bg-red-400/10 text-red-200'
                            : 'border-brand-500/25 bg-brand-500/10 text-brand-300',
                    )}>
                        <CircleDot className="h-3.5 w-3.5" /> {statusLabel(status)}
                    </span>
                </div>

                <div className={cn('grid items-center gap-4', compact ? 'mt-6 grid-cols-[1fr_auto_1fr]' : 'mt-9 grid-cols-[1fr_auto_1fr]')}>
                    <div className="min-w-0">
                        <MapPin className="mb-2 h-4 w-4 text-white/35" />
                        <p className={cn('truncate font-semibold tracking-[-0.02em]', compact ? 'text-base' : 'text-xl sm:text-2xl')}>
                            {pickupCity || 'Départ à confirmer'}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/35">Enlèvement</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-brand-500" />
                    <div className="min-w-0 text-right">
                        <PackageCheck className="mb-2 ml-auto h-4 w-4 text-white/35" />
                        <p className={cn('truncate font-semibold tracking-[-0.02em]', compact ? 'text-base' : 'text-xl sm:text-2xl')}>
                            {deliveryCity || 'Arrivée à confirmer'}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/35">Livraison</p>
                    </div>
                </div>

                {!compact && (
                    <div className="mt-9">
                        <div className="relative h-1 rounded-full bg-white/10">
                            <span
                                className={cn('absolute inset-y-0 left-0 rounded-full', cancelled ? 'bg-red-400' : 'bg-brand-500')}
                                style={{ width: `${progress}%` }}
                            />
                            {CLIENT_STATUS_STEPS.map((step, index) => {
                                const complete = progress >= ((index + 1) / CLIENT_STATUS_STEPS.length) * 100;
                                return (
                                    <span
                                        key={step}
                                        className={cn(
                                            'absolute top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink-950',
                                            complete ? 'bg-brand-500 text-ink-950' : 'bg-white/20 text-transparent',
                                        )}
                                        style={{ left: `${(index / (CLIENT_STATUS_STEPS.length - 1)) * 100}%` }}
                                    >
                                        <Check className="h-2.5 w-2.5" />
                                    </span>
                                );
                            })}
                        </div>
                        <div className="mt-3 flex justify-between text-[9px] font-medium uppercase tracking-[0.1em] text-white/30">
                            <span>Demandée</span><span>Planifiée</span><span>Enlevée</span><span>Transit</span><span>Livrée</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return id ? <Link href={`/espace-client/expeditions/${id}`} className="block focus-visible:rounded-[1.4rem]">{content}</Link> : content;
}
