'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, Package, CheckCircle2, Euro } from 'lucide-react';
import {
    ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
    CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatEuros } from '@/lib/crm';

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
        monthly: { name: string; expeditions: number; revenue: number }[];
        byStatus: { name: string; value: number; color: string }[];
        byService: { name: string; value: number }[];
        topClients: { id: string; name: string; expeditions: number; revenue: number }[];
    };
}

/** Categorical ramp: brand yellow leads, then ink and cool counterpoints. */
const SERVICE_COLORS = [
    '#fde718', '#0a0a0a', '#8a8a8a', '#0ea5e9', '#f97316',
    '#10b981', '#e6cf00', '#454545', '#38bdf8',
];

export default function AnalyticsPage() {
    const [data, setData] = React.useState<Analytics | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetch('/api/admin/analytics', { cache: 'no-store' })
            .then(res => res.ok ? res.json() : Promise.reject(new Error('failed')))
            .then(setData)
            .catch(err => console.error('Failed to load analytics', err))
            .finally(() => setLoading(false));
    }, []);

    const k = data?.kpis;

    const cards = [
        { label: 'Clients actifs', value: k ? `${k.activeClients} / ${k.totalClients}` : undefined, icon: Building2 },
        { label: 'Expéditions en cours', value: k?.activeExpeditions, icon: Package },
        { label: 'Livrées ce mois', value: k?.deliveredThisMonth, icon: CheckCircle2 },
        { label: 'CA livré ce mois', value: k ? formatEuros(k.revenueThisMonth) : undefined, icon: Euro },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-ink-950">Analytique</h1>
                <p className="text-sm text-slate-500">
                    Volumes transportés, mix de services et chiffre d&apos;affaires.
                </p>
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
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Volume et chiffre d&apos;affaires</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                    {data && data.charts.monthly.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.charts.monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false}
                                    tick={{ fontSize: 12, fill: '#676767' }} />
                                <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false}
                                    tick={{ fontSize: 12, fill: '#676767' }} />
                                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false}
                                    tick={{ fontSize: 12, fill: '#676767' }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(253,231,24,0.12)' }}
                                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 12 }}
                                    formatter={(value, name) =>
                                        name === 'CA livré (HT)'
                                            ? formatEuros(Number(value))
                                            : String(value)}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar yAxisId="left" dataKey="expeditions" name="Expéditions"
                                    fill="#fde718" stroke="#0a0a0a" strokeWidth={1} radius={[6, 6, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="revenue" name="CA livré (HT)"
                                    stroke="#0a0a0a" strokeWidth={2} dot={{ r: 3 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <Empty loading={loading} />
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Répartition par service</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {data && data.charts.byService.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.charts.byService} dataKey="value" nameKey="name"
                                        innerRadius={55} outerRadius={90} paddingAngle={2}>
                                        {data.charts.byService.map((entry, i) => (
                                            <Cell key={entry.name}
                                                fill={SERVICE_COLORS[i % SERVICE_COLORS.length]}
                                                stroke="#fff" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Legend verticalAlign="bottom" height={48} wrapperStyle={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty loading={loading} />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Principaux clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data && data.charts.topClients.length > 0 ? (
                            <div className="rounded-lg border border-slate-200 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Client</TableHead>
                                            <TableHead className="text-center">Expéditions</TableHead>
                                            <TableHead className="text-right">CA livré</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.charts.topClients.map(c => (
                                            <TableRow key={c.id} className="hover:bg-slate-50">
                                                <TableCell>
                                                    <Link href={`/admin/clients/${c.id}`}
                                                        className="font-medium text-ink-950 hover:underline">
                                                        {c.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-center text-sm font-semibold">
                                                    {c.expeditions}
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {formatEuros(c.revenue)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="py-12 text-center text-sm text-slate-500">
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
