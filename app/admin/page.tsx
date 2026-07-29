'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Building2, CheckCircle2, Euro, Package, ArrowRight,
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EXPEDITION_STATUS_STYLES, formatEuros } from '@/lib/crm';

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
        byStatus: { name: string; value: number; color: string }[];
        byService: { name: string; value: number }[];
    };
    recentExpeditions: {
        id: string; reference: string; client: string; service: string;
        status: string; statusLabel: string; createdAt: string;
    }[];
}

export default function AdminDashboardPage() {
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

    const cards = [
        { label: 'Clients', value: kpis?.totalClients, hint: `${kpis?.activeClients ?? 0} actifs`, icon: Building2 },
        { label: 'Expéditions', value: kpis?.totalExpeditions, hint: `${kpis?.activeExpeditions ?? 0} en cours`, icon: Package },
        { label: 'Livrées ce mois', value: kpis?.deliveredThisMonth, hint: 'depuis le 1er du mois', icon: CheckCircle2 },
        {
            label: 'CA livré ce mois',
            value: kpis ? formatEuros(kpis.revenueThisMonth) : undefined,
            hint: 'HT, expéditions livrées',
            icon: Euro,
        },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-ink-950">Tableau de bord</h1>
                <p className="text-sm text-slate-500">Activité transport d&apos;ULS Transport.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(card => (
                    <Card key={card.label} className="border-slate-200">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                {card.label}
                            </CardTitle>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-950">
                                <card.icon className="h-4 w-4 text-brand-500" />
                            </span>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-ink-950">
                                {loading || card.value === undefined ? '—' : card.value}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{card.hint}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-slate-200 lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Expéditions par mois</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {data && data.charts.monthly.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.charts.monthly}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false}
                                        tick={{ fontSize: 12, fill: '#676767' }} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false}
                                        tick={{ fontSize: 12, fill: '#676767' }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(253,231,24,0.12)' }}
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 12 }}
                                    />
                                    <Bar dataKey="expeditions" name="Expéditions"
                                        fill="#fde718" stroke="#0a0a0a" strokeWidth={1} radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty loading={loading} />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Par statut</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {data && data.charts.byStatus.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.charts.byStatus} dataKey="value" nameKey="name"
                                        innerRadius={50} outerRadius={80} paddingAngle={2}>
                                        {data.charts.byStatus.map(entry => (
                                            <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Legend verticalAlign="bottom" height={36}
                                        wrapperStyle={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty loading={loading} />
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Services les plus demandés</CardTitle>
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
                                            <div className="h-2 rounded-full bg-slate-100">
                                                <div className="h-2 rounded-full bg-brand-500"
                                                    style={{ width: `${(s.value / max) * 100}%` }} />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500">
                                {loading ? 'Chargement…' : 'Aucune expédition enregistrée.'}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Dernières expéditions</CardTitle>
                        <Link href="/admin/expeditions"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-ink-950">
                            Voir tout <ArrowRight className="h-3 w-3" />
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
                                            {e.statusLabel}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500">
                                {loading ? 'Chargement…' : 'Aucune expédition enregistrée.'}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}

function Empty({ loading }: { loading: boolean }) {
    return (
        <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">
                {loading ? 'Chargement…' : 'Pas encore de données.'}
            </p>
        </div>
    );
}
