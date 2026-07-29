'use client';

import { useState, useEffect } from 'react';
import { useAdminRole } from '@/components/admin/AdminLayoutClient';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n/context';
import { toast } from 'sonner';
import {
    Loader2,
    Save,
    Mail,
    MessageCircle,
    MessageSquare,
    RefreshCw,
    Trash2,
    Check,
    AlertCircle,
    Eye,
    EyeOff,
    Zap,
    Shield,
    Server,
    Key,
    Clock,
    BellRing,
    Phone,
    Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function MessagingConfigs() {
    const { t } = useLanguage();
    const role = useAdminRole();
    const [clients, setClients] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [config, setConfig] = useState<any>(null);
    const [isLoadingConfig, setIsLoadingConfig] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState<'email' | 'whatsapp' | null>(null);
    const [testResults, setTestResults] = useState<{ email?: boolean; whatsapp?: boolean }>({});
    const [showPasswords, setShowPasswords] = useState<{ smtp: boolean; whatsapp: boolean }>({
        smtp: false,
        whatsapp: false
    });
    const [groups, setGroups] = useState<{ jid: string; name: string }[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);

    const fetchGroups = async () => {
        if (!selectedClientId) return;
        setIsLoadingGroups(true);
        setGroups([]);
        try {
            const res = await fetch(`/api/admin/messaging/groups?clientId=${selectedClientId}`);
            const data = await res.json();
            if (res.ok && data.groups) {
                setGroups(data.groups);
                if (data.groups.length === 0) toast.info('No groups found on this WaSender account');
            } else {
                toast.error(data.error || 'Failed to fetch groups');
            }
        } catch {
            toast.error('Failed to fetch groups');
        } finally {
            setIsLoadingGroups(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedClientId) {
            fetchConfig(selectedClientId);
            setTestResults({});
        } else {
            setConfig(null);
        }
    }, [selectedClientId]);

    const fetchInitialData = async () => {
        try {
            const clientsRes = await fetch('/api/admin/users/clients');

            if (clientsRes.ok) {
                const clientsData = await clientsRes.json();
                const clientList = clientsData.clients || [];
                setClients(clientList);

                if (clientList.length > 0) {
                    setSelectedClientId(clientList[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch clients:', error);
            toast.error('Failed to load clients');
        } finally {
            setIsLoadingData(false);
        }
    };

    const fetchConfig = async (clientId: string) => {
        setIsLoadingConfig(true);
        try {
            const configRes = await fetch(`/api/admin/messaging/config?clientId=${clientId}`);

            if (configRes.ok) {
                const data = await configRes.json();
                setConfig(data);
            } else {
                setConfig({
                    clientMessagingEnabled: false,
                    smtpEnabled: false,
                    smtpAutoSend: false,
                    whatsappEnabled: false,
                    whatsappAutoSend: false,
                    whatsappTimeout: 0,
                    whatsappTemplate: '',
                    whatsappProvider: 'wasender',
                    smtpEncryption: 'TLS',
                    smtpPort: 587,
                    staffNotifyEnabled: false,
                    staffNotifyPhone: '',
                    staffNotifyGroupId: '',
                    staffNotifyMode: 'phone',
                });
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
            setConfig(null);
            toast.error('Failed to load configuration');
        } finally {
            setIsLoadingConfig(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedClientId) return;

        setIsSaving(true);
        try {
            const response = await fetch(`/api/admin/messaging/config?clientId=${selectedClientId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Configuration deleted');
                fetchConfig(selectedClientId);
                setTestResults({});
            } else {
                toast.error('Failed to delete configuration');
            }
        } catch (error) {
            toast.error('Failed to delete configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!selectedClientId) return;

        setIsSaving(true);
        try {
            // Strip DB-internal fields before sending to avoid payload bloat
            // (the `config` column stores a JSON snapshot that grows on every save)
            const { id, config: _configBlob, type, clientId: _cid, createdAt, updatedAt,
                    messageLogs, ...configToSend } = config as any;

            const response = await fetch('/api/admin/messaging/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: selectedClientId,
                    config: configToSend
                })
            });

            if (response.ok) {
                toast.success(t.messaging.config.toasts.saveSuccess);
                fetchConfig(selectedClientId);
            } else {
                toast.error(t.messaging.config.toasts.saveError);
            }
        } catch (error) {
            toast.error(t.messaging.config.toasts.saveError);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async (channel: 'email' | 'whatsapp') => {
        if (!selectedClientId) return;

        setIsTesting(channel);
        try {
            const response = await fetch('/api/admin/messaging/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: channel,
                    config: config,
                    testRecipient: channel === 'email' ? config.smtpFromEmail : config.testRecipient || '+33600000000'
                })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                toast.success(t.messaging.compose.testSuccess);
                setTestResults(prev => ({ ...prev, [channel]: true }));
            } else {
                toast.error(data.error || t.messaging.compose.testError);
                setTestResults(prev => ({ ...prev, [channel]: false }));
            }
        } catch (error) {
            toast.error(t.messaging.compose.testError);
            setTestResults(prev => ({ ...prev, [channel]: false }));
        } finally {
            setIsTesting(null);
        }
    };

    // Skeleton loader for config cards
    const ConfigSkeleton = () => (
        <div className="space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-slate-200 rounded"></div>
            <div className="space-y-3">
                <div className="h-10 w-full bg-slate-200 rounded"></div>
                <div className="h-10 w-full bg-slate-200 rounded"></div>
                <div className="h-10 w-full bg-slate-200 rounded"></div>
            </div>
        </div>
    );

    if (isLoadingData) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-6 w-48 bg-slate-200 rounded"></div>
                            <div className="h-10 w-full bg-slate-200 rounded"></div>
                        </div>
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card><CardContent className="p-6"><ConfigSkeleton /></CardContent></Card>
                    <Card><CardContent className="p-6"><ConfigSkeleton /></CardContent></Card>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                {/* Client Selector Card */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-ink-700" />
                            {t.messaging.config.title}
                        </CardTitle>
                        <CardDescription>{t.messaging.config.subtitle}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t.messaging.config.client}
                            </Label>
                            <Select
                                value={selectedClientId}
                                onValueChange={setSelectedClientId}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            <span className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                {client.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedClientId && config && (
                            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-slate-900">
                                        {t.messaging.config.clientMessagingEnabled}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {t.messaging.config.clientMessagingEnabledHint}
                                    </p>
                                </div>
                                <Switch
                                    checked={!!config.clientMessagingEnabled}
                                    onCheckedChange={(val) => setConfig({ ...config, clientMessagingEnabled: val })}
                                    disabled={isLoadingConfig || isSaving}
                                />
                            </div>
                        )}

                        {clients.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 flex items-start gap-3"
                            >
                                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium">No clients found</p>
                                    <p className="text-sm text-yellow-700">Please create a client first to configure messaging.</p>
                                </div>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>

                {/* Config Cards */}
                <AnimatePresence mode="wait">
                    {selectedClientId && config && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12"
                        >
                            {/* SMTP Config */}
                            <Card className={cn(
                                "border-2 transition-colors",
                                config.smtpEnabled ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
                            )}>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2.5 rounded-xl transition-colors",
                                                config.smtpEnabled ? "bg-blue-100" : "bg-slate-100"
                                            )}>
                                                <Mail className={cn(
                                                    "h-5 w-5 transition-colors",
                                                    config.smtpEnabled ? "text-blue-600" : "text-slate-400"
                                                )} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{t.messaging.config.smtp.title}</CardTitle>
                                                <CardDescription className="text-xs">Configure SMTP settings</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {testResults.email !== undefined && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className={cn(
                                                        "w-6 h-6 rounded-full flex items-center justify-center",
                                                        testResults.email ? "bg-green-100" : "bg-red-100"
                                                    )}
                                                >
                                                    {testResults.email ? (
                                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                                                    )}
                                                </motion.div>
                                            )}
                                            <Switch
                                                checked={config.smtpEnabled}
                                                onCheckedChange={(val) => setConfig({ ...config, smtpEnabled: val })}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">{t.messaging.config.smtp.host}</Label>
                                            <Input
                                                value={config.smtpHost || ''}
                                                onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                                                placeholder="smtp.example.com"
                                                className="h-10"
                                                disabled={!config.smtpEnabled}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">{t.messaging.config.smtp.port}</Label>
                                            <Input
                                                type="number"
                                                value={config.smtpPort || ''}
                                                onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value) || 587 })}
                                                placeholder="587"
                                                className="h-10"
                                                disabled={!config.smtpEnabled}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">{t.messaging.config.smtp.username}</Label>
                                        <Input
                                            value={config.smtpUsername || ''}
                                            onChange={(e) => setConfig({ ...config, smtpUsername: e.target.value })}
                                            className="h-10"
                                            disabled={!config.smtpEnabled}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Encryption</Label>
                                        <Select
                                            value={config.smtpEncryption || 'TLS'}
                                            onValueChange={(val) => setConfig({ ...config, smtpEncryption: val })}
                                            disabled={!config.smtpEnabled}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SSL">SSL (Port 465)</SelectItem>
                                                <SelectItem value="TLS">TLS (Port 587)</SelectItem>
                                                <SelectItem value="None">None (Not Recommended)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">{t.messaging.config.smtp.password}</Label>
                                        <div className="relative">
                                            <Input
                                                type={showPasswords.smtp ? "text" : "password"}
                                                value={config.smtpPassword ? (config.smtpPassword === '********' ? '' : config.smtpPassword) : ''}
                                                placeholder={config.smtpPassword ? '********' : 'Enter password'}
                                                onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                                                className="h-10 pr-10"
                                                disabled={!config.smtpEnabled}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-10 w-10 p-0"
                                                onClick={() => setShowPasswords(p => ({ ...p, smtp: !p.smtp }))}
                                            >
                                                {showPasswords.smtp ? (
                                                    <EyeOff className="h-4 w-4 text-slate-400" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-slate-400" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">{t.messaging.config.smtp.fromName}</Label>
                                            <Input
                                                value={config.smtpFromName || ''}
                                                onChange={(e) => setConfig({ ...config, smtpFromName: e.target.value })}
                                                className="h-10"
                                                disabled={!config.smtpEnabled}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">{t.messaging.config.smtp.fromEmail}</Label>
                                            <Input
                                                value={config.smtpFromEmail || ''}
                                                onChange={(e) => setConfig({ ...config, smtpFromEmail: e.target.value })}
                                                className="h-10"
                                                disabled={!config.smtpEnabled}
                                            />
                                        </div>
                                    </div>

                                    {/* Auto-Send Section */}
                                    <div className={cn(
                                        "p-4 rounded-xl border transition-colors",
                                        config.smtpAutoSend ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Zap className={cn(
                                                    "h-4 w-4",
                                                    config.smtpAutoSend ? "text-blue-600" : "text-slate-400"
                                                )} />
                                                <div>
                                                    <Label className="text-sm font-medium">Auto-Send</Label>
                                                    <p className="text-xs text-slate-500">Automatically send emails to new leads</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={config.smtpAutoSend}
                                                onCheckedChange={(checked) => setConfig({ ...config, smtpAutoSend: checked })}
                                                disabled={!config.smtpEnabled}
                                            />
                                        </div>
                                        <AnimatePresence>
                                            {config.smtpAutoSend && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-4 space-y-2"
                                                >
                                                    <Label className="text-xs flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Delay (minutes)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={config.smtpTimeout || 0}
                                                        onChange={(e) => setConfig({ ...config, smtpTimeout: parseInt(e.target.value) || 0 })}
                                                        className="h-9"
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleTest('email')}
                                        disabled={isTesting !== null || !config.smtpEnabled}
                                    >
                                        {isTesting === 'email' ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        {t.messaging.config.test}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* WhatsApp Config */}
                            <Card className={cn(
                                "border-2 transition-colors",
                                config.whatsappEnabled ? "border-green-200 bg-green-50/30" : "border-slate-200"
                            )}>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2.5 rounded-xl transition-colors",
                                                config.whatsappEnabled ? "bg-green-100" : "bg-slate-100"
                                            )}>
                                                <MessageCircle className={cn(
                                                    "h-5 w-5 transition-colors",
                                                    config.whatsappEnabled ? "text-green-600" : "text-slate-400"
                                                )} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{t.messaging.config.whatsapp.title}</CardTitle>
                                                <CardDescription className="text-xs">Configure WhatsApp API</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {testResults.whatsapp !== undefined && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className={cn(
                                                        "w-6 h-6 rounded-full flex items-center justify-center",
                                                        testResults.whatsapp ? "bg-green-100" : "bg-red-100"
                                                    )}
                                                >
                                                    {testResults.whatsapp ? (
                                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                                                    )}
                                                </motion.div>
                                            )}
                                            <Switch
                                                checked={config.whatsappEnabled}
                                                onCheckedChange={(val) => setConfig({ ...config, whatsappEnabled: val })}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">{t.messaging.config.whatsapp.provider}</Label>
                                        <Select
                                            value={config.whatsappProvider || 'wasender'}
                                            onValueChange={(val) => setConfig({ ...config, whatsappProvider: val })}
                                            disabled={!config.whatsappEnabled}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="wasender">
                                                    <span className="flex items-center gap-2">
                                                        <Shield className="h-3.5 w-3.5 text-green-600" />
                                                        WasenderAPI
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs flex items-center gap-1">
                                            <Key className="h-3 w-3" />
                                            {t.messaging.config.whatsapp.apiKey}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type={showPasswords.whatsapp ? "text" : "password"}
                                                value={config.whatsappApiKey ? (config.whatsappApiKey === '********' ? '' : config.whatsappApiKey) : ''}
                                                placeholder={config.whatsappApiKey ? '********' : 'Enter API key'}
                                                onChange={(e) => setConfig({ ...config, whatsappApiKey: e.target.value })}
                                                className="h-10 pr-10"
                                                disabled={!config.whatsappEnabled}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-10 w-10 p-0"
                                                onClick={() => setShowPasswords(p => ({ ...p, whatsapp: !p.whatsapp }))}
                                            >
                                                {showPasswords.whatsapp ? (
                                                    <EyeOff className="h-4 w-4 text-slate-400" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-slate-400" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">{t.messaging.config.whatsapp.apiUrl}</Label>
                                        <Input
                                            value={config.whatsappApiUrl || ''}
                                            onChange={(e) => setConfig({ ...config, whatsappApiUrl: e.target.value })}
                                            placeholder="https://..."
                                            className="h-10"
                                            disabled={!config.whatsappEnabled}
                                        />
                                    </div>

                                    {/* Auto-Send Section */}
                                    <div className={cn(
                                        "p-4 rounded-xl border transition-colors",
                                        config.whatsappAutoSend ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Zap className={cn(
                                                    "h-4 w-4",
                                                    config.whatsappAutoSend ? "text-green-600" : "text-slate-400"
                                                )} />
                                                <div>
                                                    <Label className="text-sm font-medium">Auto-Send</Label>
                                                    <p className="text-xs text-slate-500">Automatically send WhatsApp to new leads</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={config.whatsappAutoSend}
                                                onCheckedChange={(val) => setConfig({ ...config, whatsappAutoSend: val })}
                                                disabled={!config.whatsappEnabled}
                                            />
                                        </div>
                                        <AnimatePresence>
                                            {config.whatsappAutoSend && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-4 space-y-2"
                                                >
                                                    <Label className="text-xs flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Delay (minutes)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={config.whatsappTimeout || 0}
                                                        onChange={(e) => setConfig({ ...config, whatsappTimeout: parseInt(e.target.value) || 0 })}
                                                        placeholder="0 for immediate"
                                                        className="h-9"
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Template Info */}
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <MessageSquare className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                                            <div className="text-xs text-slate-600 space-y-1">
                                                <p className="font-medium">Message Templates</p>
                                                <p>Use the <strong>Templates</strong> tab to create rich templates with variables.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleTest('whatsapp')}
                                        disabled={isTesting !== null || !config.whatsappEnabled}
                                    >
                                        {isTesting === 'whatsapp' ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        {t.messaging.config.test}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Staff Notification Card */}
                            <Card className={cn(
                                "border-2 transition-colors md:col-span-2",
                                config.staffNotifyEnabled ? "border-sky-200 bg-sky-50/30" : "border-slate-200"
                            )}>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2.5 rounded-xl transition-colors",
                                                config.staffNotifyEnabled ? "bg-sky-100" : "bg-slate-100"
                                            )}>
                                                <BellRing className={cn(
                                                    "h-5 w-5 transition-colors",
                                                    config.staffNotifyEnabled ? "text-sky-600" : "text-slate-400"
                                                )} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">Staff Notification</CardTitle>
                                                <CardDescription className="text-xs">
                                                    Notify your assistant or secretary via WhatsApp when a new lead arrives
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={!!config.staffNotifyEnabled}
                                            onCheckedChange={(val) => setConfig({ ...config, staffNotifyEnabled: val })}
                                            disabled={!config.whatsappEnabled}
                                        />
                                    </div>
                                </CardHeader>
                                <AnimatePresence>
                                    {config.staffNotifyEnabled && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            <CardContent className="space-y-4 pt-0">
                                                {/* Mode selector */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Notification Mode</Label>
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfig({ ...config, staffNotifyMode: 'phone' })}
                                                            className={cn(
                                                                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors",
                                                                (config.staffNotifyMode || 'phone') === 'phone'
                                                                    ? "border-sky-400 bg-sky-50 text-sky-700"
                                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                            )}
                                                        >
                                                            <Phone className="h-4 w-4" />
                                                            Individual Phone
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfig({ ...config, staffNotifyMode: 'group' })}
                                                            className={cn(
                                                                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors",
                                                                config.staffNotifyMode === 'group'
                                                                    ? "border-sky-400 bg-sky-50 text-sky-700"
                                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                            )}
                                                        >
                                                            <Users className="h-4 w-4" />
                                                            WhatsApp Group
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Phone input */}
                                                {(config.staffNotifyMode || 'phone') === 'phone' && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            Assistant / Secretary Phone Number
                                                        </Label>
                                                        <Input
                                                            value={config.staffNotifyPhone || ''}
                                                            onChange={(e) => setConfig({ ...config, staffNotifyPhone: e.target.value })}
                                                            placeholder="+212600000000"
                                                            className="h-10"
                                                        />
                                                        <p className="text-xs text-slate-500">
                                                            Use international format, e.g. +212612345678
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Group picker */}
                                                {config.staffNotifyMode === 'group' && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs flex items-center gap-1">
                                                                <Users className="h-3 w-3" />
                                                                WhatsApp Group
                                                            </Label>
                                                            <button
                                                                type="button"
                                                                onClick={fetchGroups}
                                                                disabled={isLoadingGroups || !config.whatsappApiKey}
                                                                className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isLoadingGroups
                                                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    : <RefreshCw className="h-3.5 w-3.5" />
                                                                }
                                                                {isLoadingGroups ? 'Fetching…' : 'Fetch groups'}
                                                            </button>
                                                        </div>

                                                        {groups.length > 0 ? (
                                                            <Select
                                                                value={config.staffNotifyGroupId || ''}
                                                                onValueChange={(val) => setConfig({ ...config, staffNotifyGroupId: val })}
                                                            >
                                                                <SelectTrigger className="h-10">
                                                                    <SelectValue placeholder="Select a group…" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {groups.map((g) => (
                                                                        <SelectItem key={g.jid} value={g.jid}>
                                                                            {g.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input
                                                                value={config.staffNotifyGroupId || ''}
                                                                onChange={(e) => setConfig({ ...config, staffNotifyGroupId: e.target.value })}
                                                                placeholder="Click «Fetch groups» or paste group ID manually"
                                                                className="h-10"
                                                            />
                                                        )}

                                                        {config.staffNotifyGroupId && (
                                                            <p className="text-xs text-slate-400 font-mono truncate">
                                                                ID: {config.staffNotifyGroupId}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-slate-500">
                                                            Your WaSender account must be a member of the group.
                                                        </p>
                                                    </div>
                                                )}

                                                {!config.whatsappEnabled && (
                                                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                        WhatsApp must be enabled above for staff notifications to work.
                                                    </div>
                                                )}
                                            </CardContent>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>

                            {/* Action Buttons */}
                            <div className="md:col-span-2 flex justify-between gap-3 pt-4">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                                            disabled={isSaving || role !== 'ADMIN'}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Config
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the messaging configuration for this client.
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <Button
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
                                    onClick={handleSave}
                                    disabled={isSaving || role !== 'ADMIN'}
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    {t.messaging.config.save}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </TooltipProvider>
    );
}
