'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@/lib/hooks/use-query';
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
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/i18n/context';
import { toast } from 'sonner';
import {
    Loader2,
    Send,
    Mail,
    MessageCircle,
    User,
    Search,
    Check,
    ChevronsUpDown,
    AlertCircle,
    Eye,
    Clock,
    X,
    Building,
    Phone,
    AtSign,
    Bold,
    Italic,
    Strikethrough,
    Code,
    Keyboard,
    ChevronRight,
    Settings,
    Server,
    Zap,
    History
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, escapeHtml } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { TemplatePicker } from '@/components/admin/templates/TemplatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/** A client company or one of its named contacts. */
interface Lead {
    id: string;
    /** The company this recipient belongs to, for client-scoped templates. */
    clientId?: string;
    name: string;
    phone: string | null;
    email: string;
    company?: string | null;
    createdAt?: string;
}

/** What `/api/admin/messaging/status` reports about the ULS account. */
interface MessagingStatus {
    emailSetup: boolean;
    whatsappSetup: boolean;
    emailAutoSend: boolean;
    whatsappAutoSend: boolean;
    whatsappTimeout: number;
    smtpTimeout: number;
}

/** One row of the message log, as the history panel reads it. */
interface MessageLogRow {
    id: string;
    channel: string;
    recipient: string;
    subject?: string | null;
    status: string;
    createdAt: string;
}

interface ValidationErrors {
    recipient?: string;
    subject?: string;
    message?: string;
}

const DRAFT_KEY = 'messaging_draft';

// Variable definitions for the inserter
const VARIABLES = [
    { key: '{{name}}', label: 'Name', icon: User, description: 'Lead name' },
    { key: '{{email}}', label: 'Email', icon: AtSign, description: 'Lead email' },
    { key: '{{phone}}', label: 'Phone', icon: Phone, description: 'Lead phone' },
    { key: '{{company}}', label: 'Company', icon: Building, description: 'Company name' },
    { key: '{{date}}', label: 'Date', icon: Clock, description: 'Current date' },
    { key: '{{time}}', label: 'Time', icon: Clock, description: 'Current time' },
];

// WhatsApp formatting options
const WHATSAPP_FORMATS = [
    { icon: Bold, format: '*', label: 'Bold', shortcut: 'Ctrl+B' },
    { icon: Italic, format: '_', label: 'Italic', shortcut: 'Ctrl+I' },
    { icon: Strikethrough, format: '~', label: 'Strikethrough', shortcut: 'Ctrl+S' },
    { icon: Code, format: '```', label: 'Code', shortcut: 'Ctrl+`' },
];


/** Loading placeholder. Defined at module scope: a component
 * created during render is a new type on every pass, so React
 * unmounts and remounts it instead of updating it. */
function SkeletonLoader() {
    return (
    <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
        <div className="h-10 bg-slate-200 rounded-lg w-3/4"></div>
        <div className="h-32 bg-slate-200 rounded-lg w-full"></div>
    </div>
    );
}

export function MessagingCompose() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Core state
    const [channel, setChannel] = useState<'email' | 'whatsapp'>('whatsapp');
    const [recipient, setRecipient] = useState(searchParams.get('phone') || '');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Lead Selection
    const [leadSearchQuery, setLeadSearchQuery] = useState('');
    const [isLeadPopoverOpen, setIsLeadPopoverOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [leadHistory, setLeadHistory] = useState<MessageLogRow[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // New UX state
    const [showLivePreview, setShowLivePreview] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);

    // Restore a saved draft once, after hydration.
    //
    // This is the one place in the file that genuinely has to set state from an
    // effect. localStorage does not exist during SSR, so seeding these fields
    // during render would make the server and client markup disagree, and
    // `useSyncExternalStore` does not apply either — the auto-save below writes
    // this same key on every keystroke, so its snapshot could never be stable.
    // A single extra render on mount is the cost of restoring without a
    // hydration mismatch.
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (!savedDraft) return;
        try {
            const draft = JSON.parse(savedDraft);
            if (!draft.message && !draft.subject && !draft.recipient) return;
            /* eslint-disable react-hooks/set-state-in-effect -- see above */
            setChannel(draft.channel || 'whatsapp');
            setRecipient(draft.recipient || '');
            setSubject(draft.subject || '');
            setMessage(draft.message || '');
            setDraftLoaded(true);
            /* eslint-enable react-hooks/set-state-in-effect */
            toast.info('Draft restored', { duration: 2000 });
        } catch (e) {
            console.error('Failed to load draft:', e);
        }
    }, []);

    // Auto-save draft
    useEffect(() => {
        if (draftLoaded || message || subject) {
            const draft = { channel, recipient, subject, message };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }, [channel, recipient, subject, message, draftLoaded]);

    // Clear draft on successful send
    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
    };

    // A ?name= in the URL opens the composer with a greeting already typed.
    // Adjusted during render, and only when the parameter actually changes, so
    // it never overwrites what the user has since written.
    const nameParam = searchParams.get('name');
    const [greetedName, setGreetedName] = useState<string | null>(null);
    if (nameParam && nameParam !== greetedName) {
        setGreetedName(nameParam);
        setMessage(`Hello ${nameParam}, `);
    }

    // Recipients are clients and their contacts. This used to call
    // /api/admin/leads — an endpoint removed with the lead pipeline, so the
    // picker had been quietly empty ever since.
    const recipientsQuery = useQuery(
        'recipients',
        async (): Promise<{ recipients?: Lead[] }> => {
            const res = await fetch('/api/admin/messaging/recipients', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch data');
            return res.json();
        },
        { onError: error => console.error('Failed to fetch data', error) },
    );
    const leads: Lead[] = useMemo(
        () => recipientsQuery.data?.recipients ?? [],
        [recipientsQuery.data],
    );
    const isLoadingData = recipientsQuery.loading;

    // One configuration for the company, so the status is loaded once rather
    // than re-fetched whenever a "sender profile" changed.
    const statusQuery = useQuery(
        'messaging-status',
        async (): Promise<MessagingStatus> => {
            const response = await fetch('/api/admin/messaging/status', { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to fetch messaging status');
            return response.json();
        },
        { onError: error => console.error('Failed to fetch messaging status', error) },
    );
    const scopeStatus = statusQuery.data;
    const isLoadingStatus = statusQuery.loading;

    // Switching channel re-points the recipient at the same person's other
    // address and drops the template, which belonged to the previous channel.
    // Adjusted during render so the field never shows the wrong one first.
    const [channelShown, setChannelShown] = useState(channel);
    if (channel !== channelShown) {
        setChannelShown(channel);
        setSelectedTemplateId(null);
        if (selectedLead) {
            setRecipient(channel === 'email' ? selectedLead.email : (selectedLead.phone || ''));
        }
    }

    // Real-time validation. Purely a function of the four fields below, so it is
    // computed during render rather than mirrored into state by an effect — the
    // effect version rendered once with last keystroke's errors before catching up.
    const validationErrors = useMemo<ValidationErrors>(() => {
        const errors: ValidationErrors = {};

        if (recipient) {
            if (channel === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(recipient)) {
                    errors.recipient = 'Invalid email format';
                }
            } else {
                const phoneRegex = /^\+?[0-9]{10,15}$/;
                if (!phoneRegex.test(recipient.replace(/\s/g, ''))) {
                    errors.recipient = 'Invalid phone format (e.g., +33612345678)';
                }
            }
        }

        if (channel === 'email' && subject && subject.length > 200) {
            errors.subject = 'Subject too long (max 200 characters)';
        }

        if (channel === 'whatsapp' && message.length > 4096) {
            errors.message = 'Message exceeds WhatsApp limit (4096 characters)';
        }

        return errors;
    }, [recipient, subject, message, channel]);



    const filteredLeads = useMemo(() => {
        if (!leadSearchQuery) return leads.slice(0, 50);
        const query = leadSearchQuery.toLowerCase();
        return leads.filter(lead =>
            lead.name.toLowerCase().includes(query) ||
            (lead.phone && lead.phone.includes(query)) ||
            lead.email.toLowerCase().includes(query) ||
            (lead.company && lead.company.toLowerCase().includes(query))
        ).slice(0, 50);
    }, [leads, leadSearchQuery]);

    const selectLead = async (lead: Lead) => {
        setSelectedLead(lead);
        if (channel === 'email') {
            setRecipient(lead.email);
        } else {
            setRecipient(lead.phone || '');
        }
        setIsLeadPopoverOpen(false);
        setLeadSearchQuery('');

        if (message.includes('{{name}}')) {
            setMessage(prev => prev.replace(/\{\{name\}\}/g, lead.name));
        }

        try {
            const response = await fetch(`/api/admin/messaging/logs?recipient=${encodeURIComponent(lead.email)}`);
            if (response.ok) {
                const data = await response.json();
                setLeadHistory(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch lead history:', error);
        }
    };

    const clearSelectedLead = () => {
        setSelectedLead(null);
        setRecipient('');
        setLeadHistory([]);
    };

    // Insert variable at cursor position
    const insertVariable = useCallback((variable: string) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newMessage = message.substring(0, start) + variable + message.substring(end);

        setMessage(newMessage);

        // Restore cursor position after the inserted variable
        setTimeout(() => {
            textarea.focus();
            const newPosition = start + variable.length;
            textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
    }, [message]);

    // Apply WhatsApp formatting
    const applyFormat = useCallback((format: string) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = message.substring(start, end);

        let newText: string;
        if (selectedText) {
            newText = message.substring(0, start) + format + selectedText + format + message.substring(end);
        } else {
            newText = message.substring(0, start) + format + format + message.substring(end);
        }

        setMessage(newText);

        setTimeout(() => {
            textarea.focus();
            if (selectedText) {
                const newPosition = end + format.length * 2;
                textarea.setSelectionRange(newPosition, newPosition);
            } else {
                const newPosition = start + format.length;
                textarea.setSelectionRange(newPosition, newPosition);
            }
        }, 0);
    }, [message]);

    const handleSend = useCallback(async () => {
        if (!recipient || !message || (channel === 'email' && !subject)) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (Object.keys(validationErrors).length > 0) {
            toast.error('Please fix validation errors before sending');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/messaging/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel,
                    recipient,
                    subject: channel === 'email' ? subject : undefined,
                    message,
                    templateId: selectedTemplateId || undefined
                })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setIsSent(true);
                toast.success('Message sent successfully!');
                clearDraft();

                // Reset form after animation
                setTimeout(() => {
                    setMessage('');
                    if (channel === 'email') setSubject('');
                    setIsSent(false);
                }, 1500);
            } else {
                toast.error(data.error || 'Failed to send message');
            }
        } catch {
            toast.error('Failed to send message');
        } finally {
            setIsLoading(false);
        }
    }, [channel, recipient, subject, message, selectedTemplateId, validationErrors]);

    // Keyboard shortcuts handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Ctrl/Cmd + Enter to send
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSend();
            return;
        }

        // WhatsApp formatting shortcuts
        if (channel === 'whatsapp' && (e.ctrlKey || e.metaKey)) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    applyFormat('*');
                    break;
                case 'i':
                    e.preventDefault();
                    applyFormat('_');
                    break;
            }
        }
    }, [channel, applyFormat, handleSend]);


    const getPreviewMessage = () => {
        let previewText = message;

        // Replace all variables with actual values or placeholders
        if (selectedLead) {
            previewText = previewText.replace(/\{\{name\}\}/g, selectedLead.name);
            previewText = previewText.replace(/\{\{email\}\}/g, selectedLead.email);
            previewText = previewText.replace(/\{\{phone\}\}/g, selectedLead.phone || '[No phone]');
            previewText = previewText.replace(/\{\{company\}\}/g, selectedLead.company || '[No company]');
        }
        previewText = previewText.replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
        previewText = previewText.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());

        return previewText;
    };

    const formatWhatsAppPreview = (text: string) => {
        return escapeHtml(text)
            .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
            .replace(/_([^_]+)_/g, '<em>$1</em>')
            .replace(/~([^~]+)~/g, '<del>$1</del>')
            .replace(/```([^`]+)```/g, '<code class="bg-slate-200 px-1 rounded">$1</code>')
            .replace(/\n/g, '<br/>');
    };

    // Calculate message stats
    const messageStats = useMemo(() => {
        const words = message.trim().split(/\s+/).filter(Boolean).length;
        const chars = message.length;
        return { words, chars };
    }, [message]);

    // Skeleton loader component

    if (isLoadingData) {
        return (
            <Card className="max-w-6xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse"></div>
                        <div className="space-y-2">
                            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-4 w-48 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <SkeletonLoader />
                </CardContent>
            </Card>
        );
    }

    return (
        <TooltipProvider>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto"
            >
                <div className={cn(
                    "grid gap-6 transition-all duration-300",
                    showLivePreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                )}>
                    {/* Compose Section */}
                    <Card className="relative overflow-hidden">
                        <AnimatePresence>
                            {isSent && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex flex-col items-center gap-3"
                                    >
                                        <div className={cn(
                                            "w-16 h-16 rounded-full flex items-center justify-center",
                                            channel === 'whatsapp' ? "bg-green-100" : "bg-blue-100"
                                        )}>
                                            <Check className={cn(
                                                "w-8 h-8",
                                                channel === 'whatsapp' ? "text-green-600" : "text-blue-600"
                                            )} />
                                        </div>
                                        <p className="font-semibold text-slate-700">{t.messaging.ui.sent}</p>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2.5 rounded-xl transition-colors",
                                        channel === 'whatsapp' ? "bg-green-100" : "bg-blue-100"
                                    )}>
                                        {channel === 'whatsapp' ? (
                                            <MessageCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <Mail className="h-5 w-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{t.messaging.compose.title}</CardTitle>
                                        <CardDescription className="text-sm">
                                            Compose and send messages directly
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => setShowLivePreview(!showLivePreview)}
                                            >
                                                <Eye className={cn(
                                                    "h-4 w-4 transition-colors",
                                                    showLivePreview ? "text-blue-600" : "text-slate-400"
                                                )} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {showLivePreview ? 'Hide preview' : 'Show live preview'}
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                            >
                                                <Keyboard className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <div className="space-y-1 text-xs">
                                                <p><kbd className="px-1 bg-slate-200 rounded">Ctrl</kbd> + <kbd className="px-1 bg-slate-200 rounded">Enter</kbd> to send</p>
                                                {channel === 'whatsapp' && (
                                                    <>
                                                        <p><kbd className="px-1 bg-slate-200 rounded">Ctrl</kbd> + <kbd className="px-1 bg-slate-200 rounded">B</kbd> for bold</p>
                                                        <p><kbd className="px-1 bg-slate-200 rounded">Ctrl</kbd> + <kbd className="px-1 bg-slate-200 rounded">I</kbd> for italic</p>
                                                    </>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-5">
                            {/* Channel Toggle */}
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.messaging.ui.channel}</Label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <motion.button
                                        onClick={() => setChannel('whatsapp')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all relative",
                                            channel === 'whatsapp'
                                                ? "text-green-700"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {channel === 'whatsapp' && (
                                            <motion.div
                                                layoutId="channelBg"
                                                className="absolute inset-0 bg-white shadow-sm rounded-lg"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                            />
                                        )}
                                        <MessageCircle className="h-4 w-4 relative z-10" />
                                        <span className="relative z-10">{t.messaging.compose.whatsapp}</span>
                                    </motion.button>
                                    <motion.button
                                        onClick={() => setChannel('email')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all relative",
                                            channel === 'email'
                                                ? "text-blue-700"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {channel === 'email' && (
                                            <motion.div
                                                layoutId="channelBg"
                                                className="absolute inset-0 bg-white shadow-sm rounded-lg"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                            />
                                        )}
                                        <Mail className="h-4 w-4 relative z-10" />
                                        <span className="relative z-10">{t.messaging.compose.email}</span>
                                    </motion.button>
                                </div>
                            </div>

                            {/* Sending account.
                                A picker used to sit here choosing which
                                client's credentials to send with. ULS sends
                                with its own, so the only thing left to say is
                                whether that account is ready. */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Compte d&apos;envoi
                                    </Label>
                                    {scopeStatus && !scopeStatus.emailSetup && channel === 'email' && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-amber-600 hover:text-amber-700"
                                            onClick={() => {
                                                // Navigate to configs tab
                                                const event = new CustomEvent('switchTab', { detail: 'configs' });
                                                window.dispatchEvent(event);
                                            }}
                                        >
                                            <Settings className="h-3 w-3 mr-1" />
                                            Configurer le SMTP
                                        </Button>
                                    )}
                                    {scopeStatus && !scopeStatus.whatsappSetup && channel === 'whatsapp' && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-amber-600 hover:text-amber-700"
                                            onClick={() => {
                                                const event = new CustomEvent('switchTab', { detail: 'configs' });
                                                window.dispatchEvent(event);
                                            }}
                                        >
                                            <Settings className="h-3 w-3 mr-1" />
                                            Configurer WhatsApp
                                        </Button>
                                    )}
                                </div>
                                <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                                    <Server className="h-4 w-4 shrink-0 text-slate-400" />
                                    ULS Transport
                                </div>

                                {/* Status Indicators - Clickable */}
                                <AnimatePresence>
                                    {scopeStatus && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex flex-wrap gap-2 pt-1"
                                        >
                                            {/* An "Inherited from System" badge used to sit
                                                here, from a time when a client's configuration
                                                could fall back to a parent one. With a single
                                                configuration there is nothing to inherit. */}
                                            {channel === 'email' ? (
                                                <>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px] cursor-pointer transition-all hover:scale-105",
                                                            scopeStatus.emailSetup
                                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                                        )}
                                                    >
                                                        {scopeStatus.emailSetup ? <Check className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                                                        SMTP {scopeStatus.emailSetup ? 'Ready' : 'Not Setup'}
                                                    </Badge>
                                                    {scopeStatus.emailAutoSend && (
                                                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                                            <Zap className="h-3 w-3 mr-1" />
                                                            Auto-Send Active
                                                        </Badge>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px] cursor-pointer transition-all hover:scale-105",
                                                            scopeStatus.whatsappSetup
                                                                ? "bg-green-50 text-green-700 border-green-200"
                                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                                        )}
                                                    >
                                                        {scopeStatus.whatsappSetup ? <Check className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                                                        WhatsApp {scopeStatus.whatsappSetup ? 'Ready' : 'Not Setup'}
                                                    </Badge>
                                                    {scopeStatus.whatsappAutoSend && (
                                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                                            <Zap className="h-3 w-3 mr-1" />
                                                            Auto-Send Active
                                                        </Badge>
                                                    )}
                                                    {scopeStatus.whatsappTimeout > 0 && (
                                                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            {scopeStatus.whatsappTimeout}m Delay
                                                        </Badge>
                                                    )}
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {isLoadingStatus && (
                                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Checking configuration...
                                    </div>
                                )}
                            </div>

                            {/* Selected Lead Card */}
                            <AnimatePresence mode="wait">
                                {selectedLead ? (
                                    <motion.div
                                        key="selected"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={cn(
                                            "p-4 rounded-xl border-2 transition-colors",
                                            channel === 'whatsapp'
                                                ? "bg-green-50/50 border-green-200"
                                                : "bg-blue-50/50 border-blue-200"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                                                    channel === 'whatsapp' ? "bg-green-500" : "bg-blue-500"
                                                )}>
                                                    {selectedLead.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-slate-900">{selectedLead.name}</p>
                                                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {selectedLead.email}
                                                        </span>
                                                        {selectedLead.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                {selectedLead.phone}
                                                            </span>
                                                        )}
                                                        {selectedLead.company && (
                                                            <span className="flex items-center gap-1">
                                                                <Building className="h-3 w-3" />
                                                                {selectedLead.company}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {leadHistory.length > 0 && (
                                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                                                            <History className="h-3 w-3" />
                                                            <span>
                                                                Contacted {leadHistory.length}x • Last: {new Date(leadHistory[0].createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:bg-red-100"
                                                onClick={clearSelectedLead}
                                            >
                                                <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="selector"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Recipient
                                            </Label>
                                            <Popover open={isLeadPopoverOpen} onOpenChange={setIsLeadPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs border-dashed hover:border-solid hover:bg-slate-50"
                                                    >
                                                        <User className="h-3 w-3 mr-1.5" />
                                                        Select from leads
                                                        <ChevronsUpDown className="ml-1.5 h-3 w-3 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[340px] p-0" align="end">
                                                    <div className="p-3 border-b bg-slate-50/50">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                            <Input
                                                                placeholder={t.messaging.ui.searchRecipient}
                                                                className="pl-9 h-10 bg-white"
                                                                value={leadSearchQuery}
                                                                onChange={(e) => setLeadSearchQuery(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <ScrollArea className="h-72">
                                                        {filteredLeads.length === 0 ? (
                                                            <div className="p-8 text-center text-sm text-slate-500">
                                                                <User className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                                                <p>{t.messaging.ui.noRecipients}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2">
                                                                {filteredLeads.map((lead, index) => (
                                                                    <motion.button
                                                                        key={lead.id}
                                                                        initial={{ opacity: 0, x: -10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: index * 0.02 }}
                                                                        onClick={() => selectLead(lead)}
                                                                        className="w-full text-left p-3 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-3 group"
                                                                    >
                                                                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm group-hover:bg-slate-300 transition-colors">
                                                                            {lead.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-medium text-sm text-slate-900 truncate">{lead.name}</p>
                                                                            <p className="text-xs text-slate-500 truncate">
                                                                                {channel === 'email' ? lead.email : (lead.phone || 'No phone')}
                                                                            </p>
                                                                        </div>
                                                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                                                    </motion.button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </ScrollArea>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                value={recipient}
                                                onChange={(e) => setRecipient(e.target.value)}
                                                placeholder={channel === 'email' ? 'email@example.com' : '+33612345678'}
                                                className={cn(
                                                    "h-11 transition-colors",
                                                    validationErrors.recipient && "border-red-300 focus-visible:ring-red-500"
                                                )}
                                            />
                                            {validationErrors.recipient && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-xs text-red-500 mt-1 flex items-center gap-1"
                                                >
                                                    <AlertCircle className="h-3 w-3" />
                                                    {validationErrors.recipient}
                                                </motion.p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Subject (Email only) */}
                            <AnimatePresence>
                                {channel === 'email' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2"
                                    >
                                        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Subject
                                        </Label>
                                        <Input
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder={t.messaging.ui.subjectPlaceholder}
                                            className={cn(
                                                "h-11",
                                                validationErrors.subject && "border-red-300 focus-visible:ring-red-500"
                                            )}
                                        />
                                        {validationErrors.subject && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-xs text-red-500 flex items-center gap-1"
                                            >
                                                <AlertCircle className="h-3 w-3" />
                                                {validationErrors.subject}
                                            </motion.p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Message Composition */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Message
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <TemplatePicker
                                            type={channel}
                                            scopeId={selectedLead?.clientId}
                                            onSelect={(template) => {
                                                if (channel === 'email' && template.subject) {
                                                    let subjectText = template.subject;
                                                    if (selectedLead) {
                                                        subjectText = subjectText.replace(/\{\{name\}\}/g, selectedLead.name);
                                                        subjectText = subjectText.replace(/\{\{email\}\}/g, selectedLead.email);
                                                        subjectText = subjectText.replace(/\{\{company\}\}/g, selectedLead.company || '');
                                                    }
                                                    subjectText = subjectText.replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
                                                    subjectText = subjectText.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
                                                    setSubject(subjectText);
                                                }
                                                let content = template.content;
                                                if (selectedLead) {
                                                    content = content.replace(/\{\{name\}\}/g, selectedLead.name);
                                                    content = content.replace(/\{\{email\}\}/g, selectedLead.email);
                                                    content = content.replace(/\{\{phone\}\}/g, selectedLead.phone || '');
                                                    content = content.replace(/\{\{company\}\}/g, selectedLead.company || '');
                                                }
                                                content = content.replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
                                                content = content.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
                                                setMessage(content);
                                                setSelectedTemplateId(template.id);
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Variable Inserter */}
                                <div className="flex flex-wrap gap-1.5 pb-2">
                                    {VARIABLES.map((variable) => (
                                        <Tooltip key={variable.key}>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs font-mono hover:bg-slate-100"
                                                    onClick={() => insertVariable(variable.key)}
                                                >
                                                    <variable.icon className="h-3 w-3 mr-1 text-slate-400" />
                                                    {variable.label}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-xs">
                                                {variable.description} — Click to insert {variable.key}
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>

                                {/* WhatsApp Formatting Toolbar */}
                                <AnimatePresence>
                                    {channel === 'whatsapp' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-center gap-1 pb-2"
                                        >
                                            <span className="text-xs text-slate-400 mr-2">Format:</span>
                                            {WHATSAPP_FORMATS.map((format) => (
                                                <Tooltip key={format.label}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 hover:bg-green-100"
                                                            onClick={() => applyFormat(format.format)}
                                                        >
                                                            <format.icon className="h-3.5 w-3.5 text-slate-600" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="text-xs">
                                                        {format.label} ({format.shortcut})
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Textarea
                                    ref={textareaRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t.messaging.ui.messagePlaceholder}
                                    className={cn(
                                        "min-h-[180px] resize-none transition-colors",
                                        validationErrors.message && "border-red-300 focus-visible:ring-red-500"
                                    )}
                                    maxLength={channel === 'whatsapp' ? 4096 : undefined}
                                />

                                {/* Message Stats */}
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>{messageStats.words} words</span>
                                    <span className={cn(
                                        channel === 'whatsapp' && message.length > 4000 && "text-red-500 font-medium",
                                        channel === 'whatsapp' && message.length > 3500 && message.length <= 4000 && "text-amber-500"
                                    )}>
                                        {messageStats.chars}{channel === 'whatsapp' && ' / 4096'} characters
                                    </span>
                                </div>
                            </div>

                            <Separator />

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <Keyboard className="h-3 w-3" />
                                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium">Enter</kbd> to send
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowPreview(true)}
                                        disabled={!message}
                                        className="hidden sm:flex"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Full Preview
                                    </Button>
                                    <Button
                                        onClick={handleSend}
                                        disabled={isLoading || !recipient || !message || (channel === 'email' && !subject) || Object.keys(validationErrors).length > 0}
                                        className={cn(
                                            "min-w-[120px] transition-all",
                                            channel === 'whatsapp'
                                                ? "bg-green-600 hover:bg-green-700"
                                                : "bg-blue-600 hover:bg-blue-700"
                                        )}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4 mr-2" />
                                        )}
                                        {t.messaging.compose.send}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Live Preview Panel */}
                    <AnimatePresence>
                        {showLivePreview && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ type: "spring", bounce: 0.2 }}
                            >
                                <Card className="sticky top-6 h-fit">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <Eye className="h-4 w-4 text-slate-400" />
                                                Live Preview
                                            </CardTitle>
                                            <Badge variant="outline" className="text-[10px]">
                                                {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Mock Device Frame */}
                                        <div className={cn(
                                            "rounded-2xl p-4 min-h-[300px]",
                                            channel === 'whatsapp'
                                                ? "bg-[#e5ddd5]"
                                                : "bg-slate-100"
                                        )}>
                                            {channel === 'whatsapp' ? (
                                                // WhatsApp Preview
                                                <div className="space-y-2">
                                                    {message ? (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="bg-[#dcf8c6] rounded-lg p-3 max-w-[85%] ml-auto shadow-sm"
                                                        >
                                                            <div
                                                                className="text-sm text-slate-800 whitespace-pre-wrap break-words"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: formatWhatsAppPreview(getPreviewMessage())
                                                                }}
                                                            />
                                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                                <span className="text-[10px] text-slate-500">
                                                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <Check className="h-3 w-3 text-blue-500" />
                                                                <Check className="h-3 w-3 text-blue-500 -ml-2" />
                                                            </div>
                                                        </motion.div>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                                                            Start typing to see preview...
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                // Email Preview
                                                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                                    <div className="bg-slate-50 px-4 py-3 border-b">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-slate-500 w-12">{t.messaging.ui.to}</span>
                                                                <span className="text-slate-700">
                                                                    {recipient || 'recipient@email.com'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-slate-500 w-12">{t.messaging.ui.subjectColon}</span>
                                                                <span className="text-slate-900 font-medium">
                                                                    {subject || 'No subject'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        {message ? (
                                                            <div className="text-sm text-slate-700 whitespace-pre-wrap">
                                                                {getPreviewMessage()}
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-400 text-sm italic">
                                                                Start typing to see preview...
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Variable Warnings */}
                                        <AnimatePresence>
                                            {message.includes('{{') && !selectedLead && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200"
                                                >
                                                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                                    <p className="text-xs text-amber-700">
                                                        Your message contains variables but no lead is selected. Some placeholders may not be replaced.
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Recipient Info in Preview */}
                                        {selectedLead && (
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-medium">
                                                    {selectedLead.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-xs">
                                                    <p className="font-medium text-slate-700">{selectedLead.name}</p>
                                                    <p className="text-slate-500">{channel === 'email' ? selectedLead.email : selectedLead.phone}</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Full Preview Dialog */}
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {channel === 'email' ? (
                                    <Mail className="h-5 w-5 text-blue-500" />
                                ) : (
                                    <MessageCircle className="h-5 w-5 text-green-500" />
                                )}
                                Message Preview
                            </DialogTitle>
                            <DialogDescription>
                                This is how your message will appear to the recipient.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            {channel === 'email' && subject && (
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.subject}</span>
                                    <p className="text-sm font-semibold text-slate-900">{subject}</p>
                                </div>
                            )}
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</span>
                                <p className="text-sm text-slate-900">
                                    {recipient || 'No recipient selected'}
                                    {selectedLead && <span className="text-slate-500 ml-1">({selectedLead.name})</span>}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.messaging.ui.message}</span>
                                <div className={cn(
                                    "p-4 rounded-lg border text-sm whitespace-pre-wrap",
                                    channel === 'whatsapp' ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
                                )}>
                                    {channel === 'whatsapp' ? (
                                        <div dangerouslySetInnerHTML={{ __html: formatWhatsAppPreview(getPreviewMessage()) }} />
                                    ) : (
                                        <div>{getPreviewMessage()}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </motion.div>
        </TooltipProvider>
    );
}
