import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Reçue', 'À l’étude', 'Décision', 'Clôturée'];

function progressIndex(status: string): number {
    if (status === 'RESOLUE') return 3;
    if (status === 'ACCEPTEE' || status === 'REFUSEE') return 2;
    if (status === 'EN_COURS' || status === 'INFO_REQUISE') return 1;
    return 0;
}

export function ClaimStatusRail({ status }: { status: string }) {
    const current = progressIndex(status);
    return (
        <ol className="grid grid-cols-4" aria-label="Avancement du dossier">
            {STEPS.map((step, index) => (
                <li key={step} className="relative text-center">
                    {index > 0 && <span className={cn('absolute left-0 top-2 h-0.5 w-1/2', index <= current ? 'bg-brand-500' : 'bg-white/15')} />}
                    {index < STEPS.length - 1 && <span className={cn('absolute right-0 top-2 h-0.5 w-1/2', index < current ? 'bg-brand-500' : 'bg-white/15')} />}
                    <span className={cn(
                        'relative z-10 mx-auto flex h-4 w-4 items-center justify-center rounded-full border text-ink-950',
                        index <= current ? 'border-brand-500 bg-brand-500' : 'border-white/25 bg-ink-800',
                    )}>
                        {index < current && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className={cn('mt-2 block text-[8px] font-bold uppercase tracking-[0.12em] sm:text-[9px]', index <= current ? 'text-white/75' : 'text-white/30')}>{step}</span>
                </li>
            ))}
        </ol>
    );
}
