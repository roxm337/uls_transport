'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
    CartesianGrid, Cell,
} from 'recharts';
import { EXPEDITION_STATUS_STYLES, formatEuros } from '@/lib/crm';
import { useLanguage } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { useAdminContext } from '@/components/admin/AdminLayoutClient';

interface Analytics {
    kpis: {
        totalClients: number;
        activeClients: number;
        totalExpeditions: number;
        activeExpeditions: number;
        deliveredThisMonth: number;
        revenueThisMonth: number;
    };
    charts: {
        monthly: { name: string; expeditions: number }[];
        byStatus: { status: string; name: string; value: number; color: string }[];
        byService: { name: string; value: number }[];
    };
    recentExpeditions: {
        id: string;
        reference: string;
        client: string;
        service: string;
        status: string;
        statusLabel: string;
        createdAt: string;
    }[];
}

export default function AdminDashboardPage() {
    const { t } = useLanguage();
    const { account } = useAdminContext();
    const [data, setData] = React.useState<Analytics | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [failed, setFailed] = React.useState(false);

    const load = React.useCallback(() => {
        setLoading(true);
        setFailed(false);
        requestAnalytics()
            .then(setData)
            .catch(error => {
                console.error('Failed to load analytics', error);
                setFailed(true);
            })
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        let active = true;
        requestAnalytics()
            .then(result => {
                if (active) setData(result);
            })
            .catch(error => {
                if (active) {
                    console.error('Failed to load analytics', error);
                    setFailed(true);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, []);

    const kpis = data?.kpis;
    const statusSlices = (data?.charts.byStatus ?? []).map(status => ({
        ...status,
        name: t.crm.expeditionStatus[status.status] ?? status.name,
    }));
    const statusTotal = statusSlices.reduce((sum, status) => sum + status.value, 0);
    const serviceMax = data?.charts.byService[0]?.value || 1;
    const today = new Intl.DateTimeFormat(t.locale, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date());

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="space-y-8"
        >
            <header className="flex flex-col gap-5 border-b border-ink-950/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="mb-3 flex items-center gap-3">
                        <span className="h-px w-8 bg-brand-600" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
                            {t.dashboard.controlTitle}
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {t.dashboard.liveShort}
                        </span>
                    </div>
                    <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-ink-950 sm:text-4xl lg:text-[2.8rem] lg:leading-[1.05]">
                        {t.dashboard.greeting(account?.name?.split(' ')[0] ?? null)}
                        <span className="ml-2 text-ink-950/35">{t.dashboard.shiftReady}</span>
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                        {t.dashboard.controlSubtitle}
                    </p>
                </div>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                    <time suppressHydrationWarning className="text-xs font-medium capitalize text-slate-400">
                        {today}
                    </time>
                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="h-10 rounded-full border-ink-950/15 bg-transparent px-4 shadow-none">
                            <Link href="/admin/expeditions">
                                {t.dashboard.seeFlows} <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                        <Button asChild className="h-10 rounded-full bg-ink-950 px-4 text-white shadow-none hover:bg-ink-800">
                            <Link href="/admin/expeditions?new=1">
                                <Plus className="h-3.5 w-3.5 text-brand-500" /> {t.dashboard.newExpedition}
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            {failed ? (
                <DashboardError onRetry={load} />
            ) : (
                <>
                    <section aria-label={t.dashboard.operationalPulse} className="overflow-hidden rounded-[1.25rem] border border-ink-950/10 bg-white shadow-[0_12px_40px_rgba(10,10,10,.045)]">
                        <div className="grid lg:grid-cols-[1.25fr_1fr]">
                            <div className="relative min-h-64 overflow-hidden bg-ink-950 p-6 text-white sm:p-8">
                                <div className="absolute inset-y-0 right-[14%] w-px rotate-[24deg] bg-white/10" />
                                <div className="absolute inset-x-0 bottom-6 h-px bg-white/10">
                                    <span className="absolute left-0 top-[-2px] h-[5px] w-2/5 bg-brand-500" />
                                </div>
                                <div className="relative flex h-full flex-col justify-between gap-8">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                                            {t.dashboard.operationalPulse}
                                        </p>
                                        <span className="font-mono text-[10px] tracking-[0.18em] text-brand-500">OPS / LIVE</span>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[clamp(4rem,9vw,7.25rem)] font-medium leading-none tracking-[-0.09em] text-white tabular-nums">
                                            {metricValue(loading, kpis?.activeExpeditions)}
                                        </p>
                                        <p className="mt-3 max-w-sm text-lg font-medium tracking-[-0.02em] text-white/90">
                                            {t.dashboard.inProgress}
                                        </p>
                                    </div>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
                                        {kpis ? t.dashboard.recordedTotal(kpis.totalExpeditions) : '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-3 lg:grid-cols-1">
                                <PulseMetric
                                    code="LIV"
                                    label={t.dashboard.deliveredThisMonth}
                                    value={metricValue(loading, kpis?.deliveredThisMonth)}
                                    detail={t.dashboard.deliveredHint}
                                />
                                <PulseMetric
                                    code="CA"
                                    label={t.dashboard.revenueThisMonth}
                                    value={loading || !kpis ? '—' : formatEuros(kpis.revenueThisMonth, t.locale)}
                                    detail={t.dashboard.revenueHint}
                                />
                                <PulseMetric
                                    code="CLI"
                                    label={t.dashboard.activePortfolio}
                                    value={metricValue(loading, kpis?.activeClients)}
                                    detail={kpis ? t.dashboard.clientRatio(kpis.activeClients, kpis.totalClients) : '—'}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,.75fr)]">
                        <DashboardSection
                            eyebrow={t.dashboard.sixMonths}
                            title={t.dashboard.monthlyChart}
                            aside={data ? t.dashboard.volumeTotal(data.charts.monthly.reduce((sum, month) => sum + month.expeditions, 0)) : '—'}
                        >
                            <div className="h-[290px] pt-5">
                                {data && data.charts.monthly.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.charts.monthly} barCategoryGap="34%">
                                            <CartesianGrid stroke="#eceee9" vertical={false} strokeDasharray="1 0" />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#7b7b75' }} dy={10} />
                                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} tick={{ fontSize: 10, fill: '#9a9a94' }} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(10,10,10,.025)' }}
                                                contentStyle={{ borderRadius: 8, border: '1px solid #dedfd9', fontSize: 12, boxShadow: '0 10px 30px rgba(10,10,10,.08)' }}
                                            />
                                            <Bar dataKey="expeditions" name={t.dashboard.expeditions} radius={[3, 3, 0, 0]}>
                                                {data.charts.monthly.map((month, index) => (
                                                    <Cell
                                                        key={month.name}
                                                        fill={index === data.charts.monthly.length - 1 ? '#fde718' : '#1f1f1f'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <Empty loading={loading} />}
                            </div>
                        </DashboardSection>

                        <DashboardSection eyebrow={t.dashboard.flowState} title={t.dashboard.byStatus}>
                            {data && statusSlices.length > 0 ? (
                                <div className="pt-5">
                                    <div className="mb-6 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-label={t.dashboard.statusDistribution}>
                                        {statusSlices.map(status => (
                                            <span
                                                key={status.status}
                                                title={`${status.name}: ${status.value}`}
                                                style={{ width: `${(status.value / statusTotal) * 100}%`, backgroundColor: status.color }}
                                            />
                                        ))}
                                    </div>
                                    <ul className="divide-y divide-ink-950/[0.07]">
                                        {statusSlices.map(status => (
                                            <li key={status.status} className="flex items-center gap-3 py-3">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
                                                <span className="min-w-0 flex-1 text-sm text-slate-600">{status.name}</span>
                                                <span className="font-mono text-sm font-semibold text-ink-950 tabular-nums">{status.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : <div className="h-[290px]"><Empty loading={loading} /></div>}
                        </DashboardSection>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(18rem,.72fr)_minmax(0,1.28fr)]">
                        <DashboardSection eyebrow={t.dashboard.demandRank} title={t.dashboard.topServices}>
                            {data && data.charts.byService.length > 0 ? (
                                <ol className="mt-5 divide-y divide-ink-950/[0.07]">
                                    {data.charts.byService.slice(0, 6).map((service, index) => (
                                        <li key={service.name} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3.5">
                                            <span className="font-mono text-[10px] text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-ink-800">{service.name}</p>
                                                <div className="mt-2 h-px bg-slate-100">
                                                    <div className="h-px bg-ink-950" style={{ width: `${(service.value / serviceMax) * 100}%` }} />
                                                </div>
                                            </div>
                                            <span className="font-mono text-sm font-semibold tabular-nums text-ink-950">{service.value}</span>
                                        </li>
                                    ))}
                                </ol>
                            ) : <div className="h-52"><Empty loading={loading} /></div>}
                        </DashboardSection>

                        <DashboardSection
                            eyebrow={t.dashboard.realtime}
                            title={t.dashboard.recent}
                            action={
                                <Link href="/admin/expeditions" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 hover:text-ink-950">
                                    {t.common.seeAll} <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            }
                        >
                            {data && data.recentExpeditions.length > 0 ? (
                                <div className="mt-4">
                                    <div className="hidden grid-cols-[7.5rem_minmax(0,1fr)_9rem_7rem] gap-4 border-y border-ink-950/10 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:grid">
                                        <span>{t.dashboard.reference}</span>
                                        <span>{t.dashboard.clientRoute}</span>
                                        <span>{t.dashboard.status}</span>
                                        <span className="text-right">{t.dashboard.created}</span>
                                    </div>
                                    <ul className="divide-y divide-ink-950/[0.07]">
                                        {data.recentExpeditions.map(expedition => (
                                            <li key={expedition.id}>
                                                <Link
                                                    href={`/admin/expeditions/${expedition.id}`}
                                                    className="group grid gap-2 py-3.5 transition-colors hover:bg-brand-50/70 sm:grid-cols-[7.5rem_minmax(0,1fr)_9rem_7rem] sm:items-center sm:gap-4 sm:px-1"
                                                >
                                                    <span className="font-mono text-xs font-semibold text-ink-950 group-hover:underline">
                                                        {expedition.reference}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-medium text-ink-800">{expedition.client}</span>
                                                        <span className="block truncate text-[11px] text-slate-400">{expedition.service}</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 text-xs text-slate-600">
                                                        <span className={`h-2 w-2 rounded-full border ${EXPEDITION_STATUS_STYLES[expedition.status] ?? ''}`} />
                                                        {t.crm.expeditionStatus[expedition.status] ?? expedition.statusLabel}
                                                    </span>
                                                    <time className="text-left font-mono text-[10px] text-slate-400 sm:text-right">
                                                        {formatShortDate(expedition.createdAt, t.locale)}
                                                    </time>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : <div className="h-52"><Empty loading={loading} /></div>}
                        </DashboardSection>
                    </div>
                </>
            )}
        </motion.div>
    );
}

function PulseMetric({ code, label, value, detail }: {
    code: string;
    label: string;
    value: string | number;
    detail: string;
}) {
    return (
        <div className="flex min-h-32 flex-col justify-between border-b border-ink-950/10 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b lg:border-r-0 lg:last:border-b-0">
            <div className="flex items-start justify-between gap-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
                <span className="font-mono text-[9px] text-slate-300">{code}</span>
            </div>
            <div className="mt-5">
                <p className="font-mono text-2xl font-semibold tracking-[-0.05em] text-ink-950 tabular-nums sm:text-[1.7rem]">{value}</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">{detail}</p>
            </div>
        </div>
    );
}

function DashboardSection({ eyebrow, title, aside, action, children }: {
    eyebrow: string;
    title: string;
    aside?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[1.1rem] border border-ink-950/10 bg-white p-5 shadow-[0_10px_32px_rgba(10,10,10,.035)] sm:p-6">
            <header className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
                    <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.025em] text-ink-950">{title}</h2>
                </div>
                {action ?? (aside && <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">{aside}</p>)}
            </header>
            {children}
        </section>
    );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
    const { t } = useLanguage();
    return (
        <section className="border-y border-red-200 bg-red-50/60 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-red-800">{t.dashboard.loadFailed}</p>
            <p className="mt-1 text-xs text-red-600">{t.dashboard.loadFailedHint}</p>
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 rounded-full border-red-200 bg-white text-red-700 hover:bg-red-50">
                {t.dashboard.retry}
            </Button>
        </section>
    );
}

function Empty({ loading }: { loading: boolean }) {
    const { t } = useLanguage();
    return (
        <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-400">{loading ? t.common.loading : t.common.noData}</p>
        </div>
    );
}

function metricValue(loading: boolean, value: number | undefined): string | number {
    return loading || value === undefined ? '—' : value;
}

function formatShortDate(value: string, locale: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date);
}

function requestAnalytics(): Promise<Analytics> {
    return fetch('/api/admin/analytics', { cache: 'no-store' })
        .then(response => response.ok ? response.json() : Promise.reject(new Error('failed')));
}
