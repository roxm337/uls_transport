'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Building2, CheckCircle2, Euro, Package, ArrowRight, Plus, Activity, Route,
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        id: string; reference: string; client: string; service: string;
        status: string; statusLabel: string; createdAt: string;
    }[];
}

export default function AdminDashboardPage() {
    const { t } = useLanguage();
    const { account } = useAdminContext();
    const [data, setData] = React.useState<Analytics | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetch('/api/admin/analytics', { cache: 'no-store' })
            .then(res => res.ok ? res.json() : Promise.reject(new Error('failed')))
            .then(setData)
            .catch(err => console.error('Failed to load analytics', err))
            .finally(() => setLoading(false));
    }, []);

    const kpis = data?.kpis;

    // Slice names are re-labelled client-side; the API sends French.
    const statusSlices = (data?.charts.byStatus ?? []).map(s => ({
        ...s,
        name: t.crm.expeditionStatus[s.status] ?? s.name,
    }));

    const cards = [
        { label: t.dashboard.clients, value: kpis?.totalClients, hint: t.dashboard.clientsHint(kpis?.activeClients ?? 0), icon: Building2 },
        { label: t.dashboard.expeditions, value: kpis?.totalExpeditions, hint: t.dashboard.expeditionsHint(kpis?.activeExpeditions ?? 0), icon: Package },
        { label: t.dashboard.deliveredThisMonth, value: kpis?.deliveredThisMonth, hint: t.dashboard.deliveredHint, icon: CheckCircle2 },
        {
            label: t.dashboard.revenueThisMonth,
            value: kpis ? formatEuros(kpis.revenueThisMonth, t.locale) : undefined,
            hint: t.dashboard.revenueHint,
            icon: Euro,
        },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <section className="route-grid relative overflow-hidden rounded-[1.5rem] bg-ink-950 px-5 py-6 text-white shadow-[0_20px_55px_rgba(10,10,10,.16)] sm:px-7 sm:py-7">
                <div className="absolute inset-x-0 bottom-0 h-1 route-dashes opacity-90" />
                <div className="absolute -right-12 -top-14 h-52 w-52 rounded-full border border-white/[0.06]" />
                <div className="absolute -right-2 -top-2 h-28 w-28 rounded-full border border-white/[0.06]" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" />
                                {t.dashboard.live}
                            </span>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">{t.dashboard.eyebrow}</p>
                        <h1 className="mt-1.5 max-w-2xl text-2xl font-bold tracking-[-0.025em] text-white sm:text-3xl">
                            {t.dashboard.greeting(account?.name?.split(' ')[0] ?? null)}
                            <span className="block text-white/55">{t.dashboard.greetingSub}</span>
                        </h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="border-white/15 bg-white/[0.06] text-white hover:border-white/25 hover:bg-white/10 hover:text-white">
                            <Link href="/admin/expeditions">
                                <Route className="h-4 w-4 text-brand-500" /> {t.dashboard.seeFlows}
                            </Link>
                        </Button>
                        <Button asChild className="bg-brand-500 text-ink-950 shadow-[0_8px_24px_rgba(253,231,24,.2)] hover:bg-brand-400">
                            <Link href="/admin/expeditions?new=1">
                                <Plus className="h-4 w-4" /> {t.dashboard.newExpedition}
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(card => (
                    <Card key={card.label} className="group relative overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(10,10,10,.07)]">
                        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-500 via-brand-400 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                {card.label}
                            </CardTitle>
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950 shadow-[0_6px_16px_rgba(10,10,10,.12)]">
                                <card.icon className="h-4 w-4 text-brand-500" strokeWidth={2.2} />
                            </span>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold tracking-[-0.035em] text-ink-950 tabular-nums">
                                {loading || card.value === undefined ? '—' : card.value}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                                <Activity className="h-3 w-3 text-slate-300" /> {card.hint}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Volume</p>
                        <CardTitle className="text-base">{t.dashboard.monthlyChart}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {data && data.charts.monthly.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.charts.monthly}>
                                    <CartesianGrid strokeDasharray="2 5" stroke="#e5e7e2" vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false}
                                        tick={{ fontSize: 12, fill: '#676767' }} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false}
                                        tick={{ fontSize: 12, fill: '#676767' }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(253,231,24,0.12)' }}
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e5e7e2', fontSize: 12, boxShadow: '0 12px 28px rgba(10,10,10,.09)' }}
                                    />
                                    <Bar dataKey="expeditions" name={t.dashboard.expeditions}
                                        fill="#fde718" stroke="#0a0a0a" strokeWidth={1} radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty loading={loading} />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Répartition</p>
                        <CardTitle className="text-base">{t.dashboard.byStatus}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {data && data.charts.byStatus.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusSlices} dataKey="value" nameKey="name"
                                        innerRadius={50} outerRadius={80} paddingAngle={2}>
                                        {statusSlices.map(entry => (
                                            <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Legend verticalAlign="bottom" height={36}
                                        wrapperStyle={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7e2', fontSize: 12, boxShadow: '0 12px 28px rgba(10,10,10,.09)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty loading={loading} />
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Demande</p>
                        <CardTitle className="text-base">{t.dashboard.topServices}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data && data.charts.byService.length > 0 ? (
                            <ul className="space-y-3">
                                {data.charts.byService.slice(0, 6).map(s => {
                                    const max = data.charts.byService[0].value || 1;
                                    return (
                                        <li key={s.name}>
                                            <div className="mb-1 flex items-center justify-between text-sm">
                                                <span className="text-slate-700">{s.name}</span>
                                                <span className="font-semibold text-ink-950">{s.value}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100">
                                                <div className="h-1.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                                                    style={{ width: `${(s.value / max) * 100}%` }} />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500">
                                {loading ? t.common.loading : t.dashboard.noExpeditions}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{t.dashboard.realtime}</p>
                            <CardTitle className="text-base">{t.dashboard.recent}</CardTitle>
                        </div>
                        <Link href="/admin/expeditions"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-ink-950">
                            {t.common.seeAll} <ArrowRight className="h-3 w-3" />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {data && data.recentExpeditions.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {data.recentExpeditions.map(e => (
                                    <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                                        <div className="min-w-0">
                                            <Link href={`/admin/expeditions/${e.id}`}
                                                className="font-mono text-xs font-semibold text-ink-950 hover:underline">
                                                {e.reference}
                                            </Link>
                                            <p className="truncate text-xs text-slate-500">
                                                {e.client} · {e.service}
                                            </p>
                                        </div>
                                        <Badge variant="outline"
                                            className={`shrink-0 text-[10px] ${EXPEDITION_STATUS_STYLES[e.status] ?? ''}`}>
                                            {t.crm.expeditionStatus[e.status] ?? e.statusLabel}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500">
                                {loading ? t.common.loading : t.dashboard.noExpeditions}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}

function Empty({ loading }: { loading: boolean }) {
    const { t } = useLanguage();

    return (
        <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">
                {loading ? t.common.loading : t.common.noData}
            </p>
        </div>
    );
}
