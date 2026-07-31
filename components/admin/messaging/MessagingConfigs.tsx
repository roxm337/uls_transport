'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
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

/**
 * The messaging configuration of ULS Transport.
 *
 * There is exactly one: the company's own SMTP account and WhatsApp number,
 * used to write to every client. This screen used to open on a client
 * picker, each client carrying its own credentials — which asked whoever
 * filled it in for a mail server belonging to their customer.
 *
 * Which clients are written to automatically is set per client, on the
 * client's own sheet ("Notifications automatiques").
 */
export function MessagingConfigs() {
    const { t } = useLanguage();
    const role = useAdminRole();
    const [isLoadingData, setIsLoadingData] = useState(true);

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
        setIsLoadingGroups(true);
        setGroups([]);
        try {
            const res = await fetch('/api/admin/messaging/groups');
            const data = await res.json();
            if (res.ok && data.groups) {
                setGroups(data.groups);
                if (data.groups.length === 0) toast.info('Aucun groupe sur ce compte WaSender.');
            } else {
                toast.error(data.error || 'Chargement des groupes impossible.');
            }
        } catch {
            toast.error('Chargement des groupes impossible.');
        } finally {
            setIsLoadingGroups(false);
        }
    };

    useEffect(() => {
        void fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setIsLoadingConfig(true);
        try {
            const configRes = await fetch('/api/admin/messaging/config', { cache: 'no-store' });

            if (configRes.ok) {
                setConfig(await configRes.json());
            } else {
                toast.error('Chargement de la configuration impossible.');
                setConfig(null);
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
            setConfig(null);
            toast.error('Chargement de la configuration impossible.');
        } finally {
            setIsLoadingConfig(false);
            setIsLoadingData(false);
        }
    };

    const handleDelete = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/messaging/config', {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Configuration réinitialisée.');
                await fetchConfig();
                setTestResults({});
            } else {
                toast.error('Réinitialisation impossible.');
            }
        } catch {
            toast.error('Réinitialisation impossible.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Strip DB-internal fields before sending.
            const { id, key, createdAt, updatedAt, messageLogs, ...configToSend } = config as any;

            const response = await fetch('/api/admin/messaging/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: configToSend })
            });

            if (response.ok) {
                toast.success(t.messaging.config.toasts.saveSuccess);
                await fetchConfig();
            } else {
                const data = await response.json().catch(() => ({}));
                toast.error(data.error || t.messaging.config.toasts.saveError);
            }
        } catch {
            toast.error(t.messaging.config.toasts.saveError);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async (channel: 'email' | 'whatsapp') => {
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
                {/* Identity of the sender */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-ink-700" />
                            Compte d&apos;envoi ULS Transport
                        </CardTitle>
                        <CardDescription>
                            Le compte e-mail et le numéro WhatsApp avec lesquels ULS Transport
                            écrit à ses clients. Une seule configuration pour toute la société.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3">
                            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                            <div className="text-sm text-sky-900">
                                <p className="font-medium">{t.messaging.ui.whoReceives}</p>
                                <p className="text-sky-800">
                                    L&apos;envoi automatique ci-dessous ne concerne que les clients
                                    dont la fiche a « Notifications automatiques » activé.{' '}
                                    <Link href="/admin/clients" className="underline">
                                        Voir les clients
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Config Cards */}
                <AnimatePresence mode="wait">
                    {config && (
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
                                                <CardDescription className="text-xs">{t.messaging.ui.configureSmtp}</CardDescription>
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
                                        <Label className="text-xs">{t.messaging.ui.encryption}</Label>
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
                                                <SelectItem value="None">{t.messaging.ui.encryptionNone}</SelectItem>
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
                                                    <Label className="text-sm font-medium">{t.messaging.ui.autoSend}</Label>
                                                    <p className="text-xs text-slate-500">{t.messaging.ui.autoSendEmail}</p>
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
                                                <CardDescription className="text-xs">{t.messaging.ui.configureWhatsapp}</CardDescription>
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
                                                    <Label className="text-sm font-medium">{t.messaging.ui.autoSend}</Label>
                                                    <p className="text-xs text-slate-500">{t.messaging.ui.autoSendWhatsapp}</p>
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
                                                <CardTitle className="text-base">{t.messaging.ui.staffNotification}</CardTitle>
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
                                                    <Label className="text-xs">{t.messaging.ui.notificationMode}</Label>
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
                                            <AlertDialogTitle>{t.messaging.ui.areYouSure}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the messaging configuration for this client.
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
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
