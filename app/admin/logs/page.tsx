'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { History, Trash2, ChevronLeft, ChevronRight, Loader2, Search, Filter, XCircle, UserCheck, Shield, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";
import { useLanguage } from '@/lib/i18n/context';

interface ActionLog {
    id: string;
    action: string;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
        role: string;
    } | null;
}

interface RoleCounts {
    ADMIN: number;
    MANAGER: number;
    SYSTEM: number;
}

const PAGE_SIZE = 50;

export default function LogsPage() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    // Reset to the first page alongside the debounced term, in one update:
    // sequencing them fires a request for the new term against the old page.
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const qs = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String((page - 1) * PAGE_SIZE),
            });
            if (debouncedSearch) qs.set('search', debouncedSearch);
            if (roleFilter !== 'all') qs.set('role', roleFilter);
            if (actionFilter !== 'all') qs.set('action', actionFilter);

            const res = await fetch(`/api/admin/logs?${qs.toString()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(t.logs.loadFailed);

            const data = await res.json();
            setLogs(data.logs ?? []);
            setActions(data.actions ?? []);
            if (data.pagination) {
                setPagination({ total: data.pagination.total, pages: data.pagination.pages });
            }
        } catch (error) {
            // A failed background refresh stays quiet: the visible table is
            // still valid, and a toast every 30s would be noise.
            if (!silent) {
                toast.error(error instanceof Error ? error.message : t.logs.loadFailed);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [page, debouncedSearch, roleFilter, actionFilter]);

    useEffect(() => { void fetchLogs(); }, [fetchLogs]);

    useEffect(() => {
        // Silent refresh, so the "Live" badge tells the truth.
        const interval = setInterval(() => void fetchLogs(true), 30000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    async function handleClearLogs() {
        setClearing(true);
        try {
            const res = await fetch('/api/admin/logs', { method: 'DELETE' });
            if (!res.ok) throw new Error(t.logs.purgeFailed);
            const data = await res.json();
            toast.success(t.logs.purged(data.deleted ?? 0));
            setLogs([]);
            setPage(1);
            setPagination({ total: 0, pages: 1 });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.logs.purgeFailed);
        } finally {
            setClearing(false);
        }
    }

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleString(t.locale, {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    /**
     * `details` is a JSON string column. Pretty-print it when it parses, and
     * fall back to the raw text when it does not — an unparseable value is
     * still worth reading.
     */
    const renderDetails = (details: string | null) => {
        if (!details) return '—';
        try {
            return (
                <pre className="text-xs bg-slate-100 p-1 rounded w-full whitespace-pre-wrap break-words">
                    {JSON.stringify(JSON.parse(details), null, 2)}
                </pre>
            );
        } catch {
            return <span className="break-words">{details}</span>;
        }
    };

    const simplifyUA = (ua: string | null) => {
        if (!ua) return '—';
        if (ua.includes('iPhone')) return 'iPhone';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('Macintosh')) return 'Mac';
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Linux')) return 'Linux';
        return ua.split(' ')[0] || t.logs.unknownDevice;
    };

    // Counts describe the page on screen, and say so — the totals for the
    // whole trail belong to the filters, which the API applies.
    const stats: RoleCounts = useMemo(() => ({
        ADMIN: logs.filter(l => l.user?.role === 'ADMIN').length,
        MANAGER: logs.filter(l => l.user?.role === 'MANAGER').length,
        SYSTEM: logs.filter(l => !l.user).length,
    }), [logs]);

    const hasFilters = Boolean(searchQuery) || roleFilter !== 'all' || actionFilter !== 'all';

    const clearFilters = () => {
        setSearchQuery('');
        setRoleFilter('all');
        setActionFilter('all');
        setPage(1);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 max-w-6xl mx-auto"
        >
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: t.logs.totalEntries, value: pagination.total, icon: History, color: 'slate' },
                    { label: t.logs.adminsOnPage, value: stats.ADMIN, icon: Shield, color: 'brand' },
                    { label: t.logs.managersOnPage, value: stats.MANAGER, icon: UserCheck, color: 'blue' },
                    { label: t.logs.systemOnPage, value: stats.SYSTEM, icon: Users, color: 'amber' },
                ].map((stat) => (
                    <Card key={stat.label} className="border-none shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${stat.color === 'slate' ? 'bg-slate-100' : stat.color === 'brand' ? 'bg-brand-100' : stat.color === 'blue' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                                    <stat.icon className={`h-5 w-5 ${stat.color === 'slate' ? 'text-slate-600' : stat.color === 'brand' ? 'text-ink-900' : stat.color === 'blue' ? 'text-blue-600' : 'text-amber-600'}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold tracking-tight">{t.logs.title}</h1>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        {t.logs.live}
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                    onClick={() => setConfirmClear(true)}
                    disabled={clearing || pagination.total === 0}
                >
                    {clearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    {t.logs.purge}
                </Button>
            </div>

            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-md">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-brand-100 rounded-lg">
                            <History className="h-5 w-5 text-ink-900" />
                        </div>
                        <div>
                            <CardTitle>{t.logs.cardTitle}</CardTitle>
                            <CardDescription>
                                {t.logs.cardSubtitle}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-4">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={t.logs.searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    aria-label={t.logs.clearSearch}
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-500" />
                            <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
                                <SelectTrigger className="w-[150px] h-9">
                                    <SelectValue placeholder={t.logs.table.role} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t.logs.allRoles}</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="SYSTEM">{t.logs.system}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
                                <SelectTrigger className="w-[190px] h-9">
                                    <SelectValue placeholder={t.logs.table.action} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t.logs.allActions}</SelectItem>
                                    {actions.map(action => (
                                        <SelectItem key={action} value={action}>{action}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {hasFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                {t.logs.resetFilters}
                            </Button>
                        )}
                        <div className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {t.logs.results(pagination.total)}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border bg-white overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>{t.logs.table.user}</TableHead>
                                    <TableHead>{t.logs.table.role}</TableHead>
                                    <TableHead>{t.logs.table.action}</TableHead>
                                    <TableHead>{t.logs.table.ip}</TableHead>
                                    <TableHead>{t.logs.table.device}</TableHead>
                                    <TableHead>{t.logs.table.details}</TableHead>
                                    <TableHead className="text-right">{t.logs.table.date}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t.common.loading}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {hasFilters ? t.logs.emptyFiltered : t.logs.empty}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium">
                                                        {(log.user?.name || log.user?.email || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">
                                                            {log.user?.name || (log.user ? log.user.email : t.logs.system)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">{log.user?.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {log.user ? (
                                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border ${log.user.role === 'ADMIN'
                                                        ? 'bg-brand-50 text-ink-900 border-brand-200'
                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                        }`}>
                                                        {log.user.role}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">{t.logs.systemOrDeleted}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700">
                                                {log.action}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-slate-500">
                                                {log.ipAddress || '—'}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                <span title={log.userAgent || ''}>
                                                    {simplifyUA(log.userAgent)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 max-w-[240px] whitespace-pre-wrap break-words">
                                                {renderDetails(log.details)}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDate(log.createdAt)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t mt-4">
                            <div className="text-sm text-muted-foreground">
                                {t.logs.showing(logs.length, pagination.total, page, pagination.pages)}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 1 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    {t.pagination.previous}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= pagination.pages || loading}
                                >
                                    {t.pagination.next}
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={confirmClear}
                onOpenChange={setConfirmClear}
                title={t.logs.purgeTitle}
                description={t.logs.purgeBody(pagination.total)}
                confirmLabel={t.logs.purgeConfirm}
                onConfirm={handleClearLogs}
            />
        </motion.div>
    );
}
