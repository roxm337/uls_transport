'use client';

import { useState } from 'react';
import { useQuery } from '@/lib/hooks/use-query';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FileText, Star, Eye, Loader2, Sparkles, Mail, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, escapeHtml } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/context';
import { templateCategoryLabel } from '@/lib/crm';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageTemplate {
    id: string;
    name: string;
    type: string;
    subject?: string;
    content: string;
    category?: string;
    scope: string;
    isDefault: boolean;
}

interface TemplatePickerProps {
    type: 'email' | 'whatsapp';
    scopeId?: string;
    onSelect: (template: MessageTemplate) => void;
    disabled?: boolean;
}

export function TemplatePicker({ type, scopeId, onSelect, disabled }: TemplatePickerProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [hoveredTemplate, setHoveredTemplate] = useState<MessageTemplate | null>(null);

    // Nothing is fetched until the picker is opened.
    const query = useQuery(
        JSON.stringify({ type, scopeId }),
        async (): Promise<{ templates?: MessageTemplate[] }> => {
            const params = new URLSearchParams({ type, status: 'active' });
            if (scopeId) params.append('clientId', scopeId);

            const res = await fetch(`/api/admin/templates?${params}`);
            if (!res.ok) throw new Error('Failed to load templates');
            return res.json();
        },
        {
            enabled: open,
            onError: error => console.error('Failed to load templates:', error),
        },
    );

    const loading = query.loading;
    const templates: MessageTemplate[] = query.data?.templates ?? [];


    const handleSelect = (template: MessageTemplate) => {
        onSelect(template);
        setOpen(false);
        setHoveredTemplate(null);
    };

    // Group templates by category
    const groupedTemplates = templates.reduce((acc, template) => {
        const category = template.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(template);
        return acc;
    }, {} as Record<string, MessageTemplate[]>);

    // Labels come from the shared catalogue so the expedition categories,
    // which the notification trigger reads, are named the same everywhere.
    const labelFor = (category: string) =>
        category === 'other' ? 'Autre' : templateCategoryLabel(category);

    const categoryColors: Record<string, string> = {
        welcome: 'bg-green-100 text-green-700',
        'follow-up': 'bg-blue-100 text-blue-700',
        reminder: 'bg-amber-100 text-amber-700',
        notification: 'bg-brand-100 text-ink-900',
        other: 'bg-slate-100 text-slate-700'
    };

    const colorFor = (category: string) =>
        category.startsWith('expedition:')
            ? 'bg-sky-100 text-sky-700'
            : categoryColors[category] ?? categoryColors.other;

    // Format WhatsApp preview text
    const formatPreview = (text: string) => {
        if (type === 'whatsapp') {
            return escapeHtml(text)
                .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
                .replace(/_([^_]+)_/g, '<em>$1</em>')
                .replace(/\n/g, '<br/>');
        }
        return text;
    };

    return (
        <TooltipProvider>
            <Popover open={open} onOpenChange={setOpen}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={disabled}
                                className={cn(
                                    "gap-2 border-dashed hover:border-solid transition-all",
                                    type === 'whatsapp' ? "hover:border-green-300 hover:bg-green-50" : "hover:border-blue-300 hover:bg-blue-50"
                                )}
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Templates
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{t.messaging.ui.loadTemplate}</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-[420px] p-0" align="end" sideOffset={8}>
                    <div className="flex">
                        {/* Template List */}
                        <div className="flex-1 border-r">
                            <Command>
                                <div className="flex items-center gap-2 px-3 py-2 border-b bg-slate-50/50">
                                    {type === 'email' ? (
                                        <Mail className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <MessageCircle className="h-4 w-4 text-green-500" />
                                    )}
                                    <span className="text-sm font-medium capitalize">{type} Templates</span>
                                </div>
                                <CommandInput placeholder={t.messaging.ui.searchTemplates} className="h-10" />
                                <CommandList className="max-h-[320px]">
                                    <CommandEmpty className="py-6 text-center">
                                        {loading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                                <span className="text-sm text-slate-500">{t.messaging.ui.loadingTemplates}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText className="h-8 w-8 text-slate-300" />
                                                <span className="text-sm text-slate-500">{t.messaging.ui.noTemplates}</span>
                                                <span className="text-xs text-slate-400">{t.messaging.ui.createTemplatesHint}</span>
                                            </div>
                                        )}
                                    </CommandEmpty>
                                    {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                                        <CommandGroup key={category} heading={
                                            <span className="flex items-center gap-2">
                                                <Badge variant="secondary" className={cn("text-[10px] px-1.5", colorFor(category))}>
                                                    {labelFor(category)}
                                                </Badge>
                                                <span className="text-[10px] text-slate-400">{categoryTemplates.length}</span>
                                            </span>
                                        }>
                                            {categoryTemplates.map(template => (
                                                <CommandItem
                                                    key={template.id}
                                                    value={template.name}
                                                    onSelect={() => handleSelect(template)}
                                                    onMouseEnter={() => setHoveredTemplate(template)}
                                                    onMouseLeave={() => setHoveredTemplate(null)}
                                                    className="flex items-center justify-between cursor-pointer py-2.5 px-2 group"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={cn(
                                                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                                            template.isDefault
                                                                ? type === 'whatsapp' ? "bg-green-100" : "bg-blue-100"
                                                                : "bg-slate-100 group-hover:bg-slate-200"
                                                        )}>
                                                            {template.isDefault ? (
                                                                <Star className={cn(
                                                                    "h-3.5 w-3.5",
                                                                    type === 'whatsapp' ? "text-green-600 fill-green-600" : "text-blue-600 fill-blue-600"
                                                                )} />
                                                            ) : (
                                                                <FileText className="h-3.5 w-3.5 text-slate-500" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{template.name}</p>
                                                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                                                {template.content.substring(0, 50)}...
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                                            {template.scope}
                                                        </Badge>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    ))}
                                </CommandList>
                            </Command>
                        </div>

                        {/* Preview Panel */}
                        <AnimatePresence>
                            {hoveredTemplate && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 200 }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-3 h-full bg-slate-50/50">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Eye className="h-3 w-3 text-slate-400" />
                                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{t.messaging.ui.preview}</span>
                                        </div>
                                        {type === 'email' && hoveredTemplate.subject && (
                                            <div className="mb-2">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t.messaging.ui.subject}</p>
                                                <p className="text-xs font-medium text-slate-700 truncate">{hoveredTemplate.subject}</p>
                                            </div>
                                        )}
                                        <div className={cn(
                                            "p-2 rounded-lg text-[11px] leading-relaxed max-h-[250px] overflow-y-auto",
                                            type === 'whatsapp' ? "bg-[#dcf8c6]" : "bg-white border"
                                        )}>
                                            {type === 'whatsapp' ? (
                                                <div
                                                    dangerouslySetInnerHTML={{
                                                        __html: formatPreview(hoveredTemplate.content.substring(0, 300) + (hoveredTemplate.content.length > 300 ? '...' : ''))
                                                    }}
                                                />
                                            ) : (
                                                <p className="whitespace-pre-wrap text-slate-700">
                                                    {hoveredTemplate.content.substring(0, 300)}{hoveredTemplate.content.length > 300 ? '...' : ''}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <Badge variant="secondary" className={cn("text-[9px]", colorFor(hoveredTemplate.category || 'other'))}>
                                                {labelFor(hoveredTemplate.category || 'other')}
                                            </Badge>
                                            {hoveredTemplate.isDefault && (
                                                <span className="text-[9px] text-amber-600 flex items-center gap-0.5">
                                                    <Star className="h-2.5 w-2.5 fill-amber-500" />
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </PopoverContent>
            </Popover>
        </TooltipProvider>
    );
}
