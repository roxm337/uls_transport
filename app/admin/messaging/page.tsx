'use client';

import { Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Send,
    Settings,
    History,
    Loader2,
    FileText,
    Sparkles
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/lib/i18n/context';
import { MessagingCompose } from '@/components/admin/messaging/MessagingCompose';
import { MessagingConfigs } from '@/components/admin/messaging/MessagingConfigs';
import { MessagingLogs } from '@/components/admin/messaging/MessagingLogs';
import { MessagingTemplates } from '@/components/admin/messaging/MessagingTemplates';
import { cn } from '@/lib/utils';

const tabs = [
    { value: 'compose', label: 'Compose', icon: Send, color: 'blue' },
    { value: 'configs', label: 'Config', icon: Settings, color: 'brand' },
    { value: 'templates', label: 'Templates', icon: FileText, color: 'emerald' },
    { value: 'logs', label: 'Logs', icon: History, color: 'amber' },
];

function MessagingPageContent() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('compose');

    // Listen for tab switch events from compose component
    useEffect(() => {
        const handleSwitchTab = (event: CustomEvent) => {
            setActiveTab(event.detail);
        };

        window.addEventListener('switchTab', handleSwitchTab as EventListener);
        return () => {
            window.removeEventListener('switchTab', handleSwitchTab as EventListener);
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6 max-w-7xl mx-auto"
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4"
            >
                <div className="relative">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25">
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                    />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        {t.messaging.title}
                    </h1>
                    <p className="text-slate-500 mt-0.5 flex items-center gap-2">
                        {t.messaging.subtitle}
                       
                    </p>
                </div>
            </motion.div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <TabsList className="bg-white/80 backdrop-blur-sm border shadow-sm p-1.5 h-auto gap-1">
                        {tabs.map((tab, index) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 transition-all duration-200",
                                    "data-[state=active]:shadow-sm",
                                    tab.color === 'blue' && "data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                                    tab.color === 'brand' && "data-[state=active]:bg-brand-500 data-[state=active]:text-ink-950",
                                    tab.color === 'emerald' && "data-[state=active]:bg-emerald-600 data-[state=active]:text-white",
                                    tab.color === 'amber' && "data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <TabsContent value="compose" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
                            <MessagingCompose />
                        </TabsContent>

                        <TabsContent value="configs" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
                            <MessagingConfigs />
                        </TabsContent>

                        <TabsContent value="templates" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
                            <MessagingTemplates />
                        </TabsContent>

                        <TabsContent value="logs" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
                            <MessagingLogs />
                        </TabsContent>
                    </motion.div>
                </AnimatePresence>
            </Tabs>
        </motion.div>
    );
}

// Loading skeleton for Suspense fallback
function MessagingPageSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-200 rounded-2xl"></div>
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200 rounded"></div>
                    <div className="h-4 w-64 bg-slate-200 rounded"></div>
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-11 w-28 bg-slate-200 rounded-lg"></div>
                ))}
            </div>

            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6 space-y-4">
                    <div className="h-6 w-32 bg-slate-200 rounded"></div>
                    <div className="h-10 w-full bg-slate-200 rounded"></div>
                    <div className="h-10 w-full bg-slate-200 rounded"></div>
                    <div className="h-32 w-full bg-slate-200 rounded"></div>
                    <div className="h-10 w-24 bg-slate-200 rounded ml-auto"></div>
                </div>
                <div className="bg-white rounded-xl border p-6 space-y-4 hidden lg:block">
                    <div className="h-6 w-24 bg-slate-200 rounded"></div>
                    <div className="h-64 w-full bg-slate-200 rounded-2xl"></div>
                </div>
            </div>
        </div>
    );
}

export default function MessagingPage() {
    return (
        <Suspense fallback={<MessagingPageSkeleton />}>
            <MessagingPageContent />
        </Suspense>
    );
}
