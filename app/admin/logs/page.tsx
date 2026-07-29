'use client';

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { History, Trash2, ChevronLeft, ChevronRight, Loader2, Search, Filter, XCircle, UserCheck, Shield, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from '@/lib/i18n/context';

interface ActionLog {
    id: string;
    action: string;
    details: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
        role: string;
    } | null;
}

export default function LogsPage() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        currentPage: 1,
        limit: 50
    });

    useEffect(() => {
        fetchLogs(pagination.currentPage);

        // Setup polling every 30 seconds for real-time updates (slower polling when many logs)
        const interval = setInterval(() => fetchLogs(pagination.currentPage, true), 10000);

        return () => clearInterval(interval);
    }, [pagination.currentPage]);

    async function fetchLogs(page = 1, silent = false) {
        if (!silent) setLoading(true);
        try {
            const limit = pagination.limit;
            const offset = (page - 1) * limit;
            const res = await fetch(`/api/admin/logs?limit=${limit}&offset=${offset}`);
            const data = await res.json();
            if (data.logs) {
                setLogs(data.logs);
                if (data.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        total: data.pagination.total,
                        pages: data.pagination.pages,
                        currentPage: data.pagination.currentPage
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }

    async function handleClearLogs() {
        if (!confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) return;

        setClearing(true);
        try {
            const res = await fetch('/api/admin/logs', { method: 'DELETE' });
            if (res.ok) {
                setLogs([]);
                setPagination(prev => ({ ...prev, total: 0, pages: 0, currentPage: 1 }));
            }
        } catch (error) {
            console.error('Failed to clear logs:', error);
        } finally {
            setClearing(false);
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA') + ' ' + new Date(dateString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const renderDetails = (details: any) => {
        if (!details) return '-';
        if (typeof details === 'object') {
            return (
                <pre className="text-xs bg-slate-100 p-1 rounded w-full whitespace-pre-wrap break-words">
                    {JSON.stringify(details, null, 2)}
                </pre>
            );
        }
        return String(details);
    };

    const simplifyUA = (ua: string | null) => {
        if (!ua) return '-';
        if (ua.includes('iPhone')) return 'iPhone';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('Macintosh')) return 'Mac';
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Linux')) return 'Linux';
        return ua.split(' ')[0] || 'Unknown';
    };

    const filteredLogs = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return logs.filter(log => {
            if (roleFilter !== 'all' && (log.user?.role || 'SYSTEM') !== roleFilter) return false;
            if (actionFilter !== 'all' && log.action !== actionFilter) return false;
            if (!query) return true;
            return (
                log.action.toLowerCase().includes(query) ||
                (log.user?.name || '').toLowerCase().includes(query) ||
                (log.user?.email || '').toLowerCase().includes(query) ||
                (log.ipAddress || '').toLowerCase().includes(query) ||
                (log.userAgent || '').toLowerCase().includes(query)
            );
        });
    }, [logs, searchQuery, roleFilter, actionFilter]);

    const stats = useMemo(() => {
        const byRole = {
            ADMIN: logs.filter(l => l.user?.role === 'ADMIN').length,
            MANAGER: logs.filter(l => l.user?.role === 'MANAGER').length,
            CLIENT: logs.filter(l => l.user?.role === 'CLIENT').length,
            SYSTEM: logs.filter(l => !l.user).length,
        };
        return {
            total: logs.length,
            ...byRole,
        };
    }, [logs]);

    const uniqueActions = useMemo(() => {
        const set = new Set<string>();
        logs.forEach(l => set.add(l.action));
        return Array.from(set).sort();
    }, [logs]);

    const clearFilters = () => {
        setSearchQuery('');
        setRoleFilter('all');
        setActionFilter('all');
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
                    { label: 'Total', value: stats.total, icon: History, color: 'slate' },
                    { label: 'Admins', value: stats.ADMIN, icon: Shield, color: 'brand' },
                    { label: 'Managers', value: stats.MANAGER, icon: UserCheck, color: 'blue' },
                    { label: 'System', value: stats.SYSTEM, icon: Users, color: 'amber' },
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
                    <h1 className="text-2xl font-bold tracking-tight">Admin Audit Logs</h1>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                    onClick={handleClearLogs}
                    disabled={clearing || logs.length === 0}
                >
                    {clearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Clear All Logs
                </Button>
            </div>

            {/* Admin Audit Logs */}
            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-md">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-brand-100 rounded-lg">
                            <History className="h-5 w-5 text-ink-900" />
                        </div>
                        <div>
                            <CardTitle>{t.analytics?.logs?.title || 'Audit Logs'}</CardTitle>
                            <CardDescription>
                                {t.analytics?.logs?.subtitle || 'History of actions performed by admin users.'}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-4">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by user, action, IP..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-500" />
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[140px] h-9">
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="CLIENT">Client</SelectItem>
                                    <SelectItem value="SYSTEM">System</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="w-[180px] h-9">
                                    <SelectValue placeholder="Action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    {uniqueActions.map(action => (
                                        <SelectItem key={action} value={action}>{action}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {(searchQuery || roleFilter !== 'all' || actionFilter !== 'all') && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        )}
                        <div className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {filteredLogs.length} result{filteredLogs.length === 1 ? '' : 's'}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border bg-white overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>{t.analytics?.logs?.table?.user || 'User'}</TableHead>
                                    <TableHead>{t.analytics?.logs?.table?.role || 'Role'}</TableHead>
                                    <TableHead>{t.analytics?.logs?.table?.action || 'Action'}</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Device</TableHead>
                                    <TableHead>{t.analytics?.logs?.table?.details || 'Details'}</TableHead>
                                    <TableHead className="text-right">{t.analytics?.logs?.table?.date || 'Date'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t.common?.loading || 'Loading...'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {t.analytics?.logs?.noLogs || 'No logs found.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium">
                                                        {(log.user?.name || log.user?.email || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">{log.user?.name || 'Unknown'}</div>
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
                                                    <span className="text-xs text-slate-400">System/Deleted</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700">
                                                {log.action}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-slate-500">
                                                {log.ipAddress || '-'}
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
                                Showing {logs.length} of {pagination.total} logs (Page {pagination.currentPage} of {pagination.pages})
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage - 1 }))}
                                    disabled={pagination.currentPage === 1 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage + 1 }))}
                                    disabled={pagination.currentPage === pagination.pages || loading}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
