import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OperationsPageHeaderProps {
    title: string;
    description: React.ReactNode;
    actions?: React.ReactNode;
    code?: string;
    className?: string;
}

/**
 * Shared heading for operational screens. The small route marker gives every
 * list page the same visual entry point without competing with its data.
 */
export function OperationsPageHeader({
    title,
    description,
    actions,
    code = 'OPS / CRM',
    className,
}: OperationsPageHeaderProps) {
    return (
        <header
            className={cn(
                'flex flex-col gap-5 border-b border-ink-950/10 pb-6 sm:flex-row sm:items-end sm:justify-between',
                className,
            )}
        >
            <div className="min-w-0">
                <div className="mb-2.5 flex items-center gap-2.5" aria-hidden="true">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500 ring-4 ring-brand-500/15" />
                    <span className="h-px w-8 bg-ink-950/20" />
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {code}
                    </span>
                </div>
                <h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink-950 sm:text-3xl">
                    {title}
                </h1>
                <div className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                    {description}
                </div>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
    );
}

export interface OperationsMetric {
    label: string;
    value: React.ReactNode;
    icon: LucideIcon;
}

interface OperationsMetricRailProps {
    items: OperationsMetric[];
    loading?: boolean;
    className?: string;
}

/**
 * Inspired by 21st.dev's accessible CardDisplay pattern, adapted into a ULS
 * route rail. Values remain easy to scan while the cards behave as one group
 * for assistive technology.
 */
export function OperationsMetricRail({ items, loading = false, className }: OperationsMetricRailProps) {
    return (
        <div
            className={cn('grid gap-3 sm:grid-cols-3', className)}
            role="list"
            aria-busy={loading}
            aria-live="polite"
        >
            {items.map((item) => (
                <Card
                    key={item.label}
                    role="listitem"
                    className="group relative overflow-hidden py-0 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink-950/15 hover:shadow-[0_14px_36px_rgba(10,10,10,.07)]"
                >
                    <CardContent className="flex min-h-24 items-center gap-4 p-4 sm:p-5">
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-950 shadow-[0_7px_18px_rgba(10,10,10,.14)]">
                            <item.icon className="h-5 w-5 text-brand-500" aria-hidden="true" />
                            <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-white bg-brand-500" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-ink-500">
                                {item.label}
                            </p>
                            <p className="mt-1 font-mono text-2xl font-semibold leading-none tracking-[-0.04em] text-ink-950 tabular-nums">
                                {loading ? '—' : item.value}
                            </p>
                        </div>
                    </CardContent>
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink-950/[0.06]" aria-hidden="true">
                        <span className="block h-full w-1/3 bg-brand-500 transition-[width] duration-300 group-hover:w-1/2" />
                    </span>
                </Card>
            ))}
        </div>
    );
}
