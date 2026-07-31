'use client';

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/context';
import {
    Mail,
    MessageCircle,
    Clock,
    AlertCircle,
    CheckCircle2,
    Eye,
    RefreshCw,
    Filter,
    Download,
    Search,
    Inbox,
    XCircle,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/** One row of MessageLog, as this screen reads it. */
interface MessageLogRow {
    id: string;
    channel: string;
    recipient: string;
    subject?: string | null;
    message: string;
    status: string;
    error?: string | null;
    metadata?: string | null;
    sentAt?: string | null;
    createdAt: string;
    template?: { name: string; category?: string | null } | null;
}


/** Loading placeholder. Defined at module scope: a component
 * created during render is a new type on every pass, so React
 * unmounts and remounts it instead of updating it. */
function SkeletonRow() {
    return (
    <TableRow className="animate-pulse">
        <TableCell><div className="h-4 w-20 bg-slate-200 rounded"></div></TableCell>
        <TableCell><div className="h-4 w-32 bg-slate-200 rounded"></div></TableCell>
        <TableCell><div className="h-4 w-40 bg-slate-200 rounded"></div></TableCell>
        <TableCell><div className="h-5 w-16 bg-slate-200 rounded-full"></div></TableCell>
        <TableCell><div className="h-4 w-24 bg-slate-200 rounded"></div></TableCell>
        <TableCell className="text-right"><div className="h-8 w-8 bg-slate-200 rounded ml-auto"></div></TableCell>
    </TableRow>
    );
}

export function MessagingLogs() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState<MessageLogRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<MessageLogRow | null>(null);
    const [channelFilter, setChannelFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (channelFilter !== 'all') params.append('channel', channelFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await fetch(`/api/admin/messaging/logs?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [channelFilter, statusFilter]);


    // Filter logs by search query
    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            log.recipient?.toLowerCase().includes(query) ||
            log.subject?.toLowerCase().includes(query) ||
            log.message?.toLowerCase().includes(query)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats
    const stats = {
        total: logs.length,
        sent: logs.filter(l => l.status === 'sent').length,
        failed: logs.filter(l => l.status === 'failed').length,
        email: logs.filter(l => l.channel === 'email').length,
        whatsapp: logs.filter(l => l.channel === 'whatsapp').length,
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Date', 'Channel', 'Recipient', 'Subject', 'Status', 'Error'];
        const rows = filteredLogs.map(log => [
            format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            log.channel,
            log.recipient,
            log.subject || '',
            log.status,
            log.error || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `messaging-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
    };

    // Skeleton loader

    return (
        <TooltipProvider>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: 'Total', value: stats.total, icon: Inbox, color: 'slate' },
                        { label: 'Sent', value: stats.sent, icon: CheckCircle2, color: 'green' },
                        { label: 'Failed', value: stats.failed, icon: XCircle, color: 'red' },
                        { label: 'Email', value: stats.email, icon: Mail, color: 'blue' },
                        { label: 'WhatsApp', value: stats.whatsapp, icon: MessageCircle, color: 'emerald' },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="border-none shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                        </div>
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            stat.color === 'slate' && "bg-slate-100",
                                            stat.color === 'green' && "bg-green-100",
                                            stat.color === 'red' && "bg-red-100",
                                            stat.color === 'blue' && "bg-blue-100",
                                            stat.color === 'emerald' && "bg-emerald-100"
                                        )}>
                                            <stat.icon className={cn(
                                                "h-5 w-5",
                                                stat.color === 'slate' && "text-slate-600",
                                                stat.color === 'green' && "text-green-600",
                                                stat.color === 'red' && "text-red-600",
                                                stat.color === 'blue' && "text-blue-600",
                                                stat.color === 'emerald' && "text-emerald-600"
                                            )} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Main Card */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-amber-500" />
                                    {t.messaging.logs.title}
                                </CardTitle>
                                <CardDescription>
                                    Review all communication attempts and their statuses.
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={exportToCSV}
                                            disabled={filteredLogs.length === 0}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Export
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t.messaging.ui.exportCsv}</TooltipContent>
                                </Tooltip>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchLogs}
                                    disabled={isLoading}
                                >
                                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 pt-4">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder={t.messaging.ui.searchLogs}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-9 h-9"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-500" />
                                <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-[130px] h-9">
                                        <SelectValue placeholder={t.messaging.ui.channel} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t.messaging.ui.allChannels}</SelectItem>
                                        <SelectItem value="email">
                                            <span className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-blue-500" />
                                                Email
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="whatsapp">
                                            <span className="flex items-center gap-2">
                                                <MessageCircle className="h-3 w-3 text-green-500" />
                                                WhatsApp
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[130px] h-9">
                                    <SelectValue placeholder={t.messaging.ui.status} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t.messaging.ui.allStatuses}</SelectItem>
                                    <SelectItem value="sent">
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            Sent
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="failed">
                                        <span className="flex items-center gap-2">
                                            <XCircle className="h-3 w-3 text-red-500" />
                                            Failed
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="font-semibold">{t.messaging.logs.table.channel}</TableHead>
                                        <TableHead className="font-semibold">{t.messaging.logs.table.recipient}</TableHead>
                                        <TableHead className="font-semibold">{t.messaging.logs.table.subject}</TableHead>
                                        <TableHead className="font-semibold">{t.messaging.logs.table.status}</TableHead>
                                        <TableHead className="font-semibold">{t.messaging.logs.table.date}</TableHead>
                                        <TableHead className="text-right font-semibold">{t.messaging.logs.table.actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <>
                                            <SkeletonRow />
                                            <SkeletonRow />
                                            <SkeletonRow />
                                            <SkeletonRow />
                                            <SkeletonRow />
                                        </>
                                    ) : paginatedLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-3 text-slate-500">
                                                    <Inbox className="h-12 w-12 text-slate-300" />
                                                    <div>
                                                        <p className="font-medium">{t.messaging.logs.noLogs}</p>
                                                        <p className="text-sm text-slate-400">{t.messaging.ui.logsEmpty}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <AnimatePresence>
                                            {paginatedLogs.map((log, index) => (
                                                <motion.tr
                                                    key={log.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    className="group hover:bg-slate-50/50 transition-colors"
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "p-1.5 rounded-lg",
                                                                log.channel === 'email' ? "bg-blue-100" : "bg-green-100"
                                                            )}>
                                                                {log.channel === 'email' ? (
                                                                    <Mail className="h-3.5 w-3.5 text-blue-600" />
                                                                ) : (
                                                                    <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                                                                )}
                                                            </div>
                                                            <span className="capitalize text-sm font-medium">{log.channel}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-medium text-slate-900">{log.recipient}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-slate-600 truncate max-w-[200px] block">
                                                            {log.subject || <span className="text-slate-400 italic">{t.messaging.ui.noSubject}</span>}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.status === 'sent' ? (
                                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none font-medium">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                {t.messaging.logs.status.sent}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-none font-medium">
                                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                                {t.messaging.logs.status.failed}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-slate-900">{format(new Date(log.createdAt), 'MMM d, yyyy')}</span>
                                                            <span className="text-xs text-slate-400">{format(new Date(log.createdAt), 'HH:mm')}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedLog(log)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {!isLoading && filteredLogs.length > itemsPerPage && (
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-sm text-slate-500">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm text-slate-600 min-w-[80px] text-center">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Log Details Dialog */}
                <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {selectedLog?.channel === 'email' ? (
                                    <Mail className="h-5 w-5 text-blue-500" />
                                ) : (
                                    <MessageCircle className="h-5 w-5 text-green-500" />
                                )}
                                {t.messaging.logs.details}
                            </DialogTitle>
                            <DialogDescription>
                                Detailed information about the communication attempt.
                            </DialogDescription>
                        </DialogHeader>
                        {selectedLog && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4 pt-4"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.channel}</span>
                                        <div className="flex items-center gap-2">
                                            {selectedLog.channel === 'email' ? (
                                                <Mail className="h-4 w-4 text-blue-500" />
                                            ) : (
                                                <MessageCircle className="h-4 w-4 text-green-500" />
                                            )}
                                            <span className="text-sm font-medium capitalize">{selectedLog.channel}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.recipient}</span>
                                        <p className="text-sm font-medium">{selectedLog.recipient}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.status}</span>
                                        {selectedLog.status === 'sent' ? (
                                            <Badge className="bg-green-100 text-green-700 border-none">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Sent
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-700 border-none">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Failed
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.date}</span>
                                        <p className="text-sm font-medium">
                                            {format(new Date(selectedLog.createdAt), 'MMM d, yyyy HH:mm:ss')}
                                        </p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.subject}</span>
                                        <p className="text-sm font-medium">{selectedLog.subject || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.messageContent}</span>
                                    <div className="p-4 bg-slate-50 rounded-lg border text-sm max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                                        {selectedLog.message}
                                    </div>
                                </div>
                                {selectedLog.error && (
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">{t.messaging.ui.errorMessage}</span>
                                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                            {selectedLog.error}
                                        </p>
                                    </div>
                                )}
                                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.providerMetadata}</span>
                                        <div className="p-3 bg-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
                                            <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        </TooltipProvider>
    );
}
