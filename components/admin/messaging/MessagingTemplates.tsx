'use client';

import { useState } from 'react';
import { useQuery } from '@/lib/hooks/use-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Mail, MessageCircle, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
    MANUAL_TEMPLATE_CATEGORIES,
    EXPEDITION_TEMPLATE_CATEGORIES,
    templateCategoryLabel,
} from '@/lib/crm';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useLanguage } from '@/lib/i18n/context';
import { errorMessage } from '@/lib/errors';

interface MessageTemplate {
    id: string;
    name: string;
    type: string;
    subject?: string;
    content: string;
    category?: string;
    scope: string;
    clientId?: string | null;
    status: string;
    isDefault: boolean;
    lastUsedAt?: string;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
}

export function MessagingTemplates() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formSubject, setFormSubject] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formCategory, setFormCategory] = useState('welcome');
    const [formScope, setFormScope] = useState('global');
    const [formClientId, setFormClientId] = useState<string>('');
    const [formStatus, setFormStatus] = useState('active');
    const [formIsDefault, setFormIsDefault] = useState(false);
    const [formSaving, setFormSaving] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);

    const [filterClientId, setFilterClientId] = useState<string>('all');

    const query = useQuery(
        JSON.stringify({ activeTab, filterClientId }),
        async (): Promise<{ templates?: MessageTemplate[] }> => {
            const res = await fetch(`/api/admin/templates?type=${activeTab}${filterClientId !== 'all' ? `&clientId=${filterClientId}` : ''}`);
            if (!res.ok) throw new Error('Failed to load templates');
            return res.json();
        },
        {
            onError: error => {
                toast.error('Failed to load templates');
                console.error(error);
            },
        },
    );

    const { loading, reload: loadTemplates } = query;
    const templates: MessageTemplate[] = query.data?.templates ?? [];

    // The client list feeds a filter, not the table: fetched once, and unaffected
    // by the tab or the filter above — hence a constant key.
    const clientsQuery = useQuery(
        'clients',
        async (): Promise<{ clients?: { id: string; name: string }[] }> => {
            const res = await fetch('/api/admin/users/clients');
            if (!res.ok) throw new Error('Failed to load clients');
            return res.json();
        },
        { onError: error => console.error('Failed to load clients:', error) },
    );
    const clients = clientsQuery.data?.clients ?? [];



    const resetForm = () => {
        setFormName('');
        setFormSubject('');
        setFormContent('');
        setFormCategory('welcome');
        setFormScope('global');
        setFormClientId('');
        setFormStatus('active');
        setFormIsDefault(false);
        setEditingTemplate(null);
    };

    const handleCreate = () => {
        resetForm();
        setIsCreateOpen(true);
    };

    const handleEdit = (template: MessageTemplate) => {
        setEditingTemplate(template);
        setFormName(template.name);
        setFormSubject(template.subject || '');
        setFormContent(template.content);
        setFormCategory(template.category || 'welcome');
        setFormScope(template.scope);
        setFormClientId(template.clientId || '');
        setFormStatus(template.status);
        setFormIsDefault(template.isDefault);
        setIsCreateOpen(true);
    };

    const handleSave = async () => {
        if (!formName || !formContent) {
            toast.error('Name and content are required');
            return;
        }

        if (activeTab === 'email' && !formSubject) {
            toast.error('Subject is required for email templates');
            return;
        }

        try {
            setFormSaving(true);

            const body = {
                name: formName,
                type: activeTab,
                subject: activeTab === 'email' ? formSubject : null,
                content: formContent,
                category: formCategory,
                scope: formScope,
                clientId: formScope === 'client' ? formClientId : null,
                status: formStatus,
                isDefault: formIsDefault
            };

            let res;
            if (editingTemplate) {
                res = await fetch(`/api/admin/templates/${editingTemplate.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } else {
                res = await fetch('/api/admin/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            }

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save template');
            }

            toast.success(editingTemplate ? 'Template updated' : 'Template created');
            setIsCreateOpen(false);
            resetForm();
            loadTemplates();
        } catch (error) {
            toast.error(errorMessage(error, 'Failed to save template'));
        } finally {
            setFormSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/templates/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete template');

            toast.success('Modèle supprimé.');
            loadTemplates();
        } catch {
            toast.error('Suppression impossible.');
        }
    };

    const filteredTemplates = templates.filter(tpl => {
        if (tpl.type !== activeTab) return false;
        // Filtering by client shows that client's own templates plus the
        // global ones, which apply to it too.
        if (filterClientId !== 'all' && filterClientId) {
            return tpl.clientId === filterClientId || tpl.scope === 'global';
        }
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    {/* Title removed for compact view in tabs */}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => loadTemplates()} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'email' | 'whatsapp')}>
                <div className="flex justify-between items-center mb-6">
                    <TabsList>
                        <TabsTrigger value="email">
                            <Mail className="h-4 w-4 mr-2" />
                            Email Templates
                        </TabsTrigger>
                        <TabsTrigger value="whatsapp">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp Templates
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <Select value={filterClientId} onValueChange={setFilterClientId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t.messaging.ui.filterByClient} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t.messaging.ui.allClients}</SelectItem>
                                {clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <TabsContent value={activeTab} className="mt-0">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.messaging.ui.name}</TableHead>
                                        <TableHead>{t.messaging.ui.category}</TableHead>
                                        <TableHead>{t.messaging.ui.scope}</TableHead>
                                        <TableHead>{t.messaging.ui.status}</TableHead>
                                        <TableHead>{t.messaging.ui.usage}</TableHead>
                                        <TableHead>{t.messaging.ui.lastUsed}</TableHead>
                                        <TableHead className="text-right">{t.common.actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center">{t.common.loading}</TableCell>
                                        </TableRow>
                                    ) : filteredTemplates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                No templates found. Create your first template to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTemplates.map(template => (
                                            <TableRow key={template.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {template.name}
                                                        {template.isDefault && (
                                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={template.category?.startsWith('expedition:')
                                                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                            : ''}
                                                    >
                                                        {templateCategoryLabel(template.category)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{template.scope}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                                                        {template.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{template.usageCount}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {template.lastUsedAt
                                                        ? new Date(template.lastUsedAt).toLocaleDateString()
                                                        : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(template)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setTemplateToDelete(template)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                        <DialogDescription>
                            {activeTab === 'email' ? 'Create an email template with subject and content' : 'Create a WhatsApp message template'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">{t.messaging.ui.templateName} *</Label>
                            <Input
                                id="name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder={t.messaging.ui.templateNamePlaceholder}
                            />
                        </div>

                        {activeTab === 'email' && (
                            <div>
                                <Label htmlFor="subject">{t.messaging.ui.subject} *</Label>
                                <Input
                                    id="subject"
                                    value={formSubject}
                                    onChange={(e) => setFormSubject(e.target.value)}
                                    placeholder={t.messaging.ui.subjectExamplePlaceholder}
                                />
                            </div>
                        )}

                        <div>
                            <Label htmlFor="content">{t.messaging.ui.content} *</Label>
                            <Textarea
                                id="content"
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                                placeholder={`Hello {{name}},\n\nThank you for your interest!`}
                                rows={8}
                            />
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Client : {'{{name}}'}, {'{{company}}'}, {'{{email}}'}, {'{{phone}}'}, {'{{city}}'}, {'{{date}}'}, {'{{time}}'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Expédition : {'{{reference}}'}, {'{{statut}}'}, {'{{service}}'}, {'{{trajet}}'}, {'{{enlevement_ville}}'}, {'{{enlevement_date}}'}, {'{{livraison_ville}}'}, {'{{livraison_date}}'}, {'{{marchandise}}'}, {'{{colis}}'}, {'{{poids}}'}, {'{{prix}}'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">{t.messaging.ui.category}</Label>
                                <Select value={formCategory} onValueChange={setFormCategory}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MANUAL_TEMPLATE_CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                        {/* Picking one of these binds the template to a moment in
                                            a shipment's life: it is then sent automatically when
                                            that moment arrives, for every client whose
                                            configuration allows it. */}
                                        <SelectSeparator />
                                        {EXPEDITION_TEMPLATE_CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formCategory.startsWith('expedition:') && (
                                    <p className="mt-1 text-xs text-sky-700">
                                        Envoyé automatiquement à ce moment du transport, si l&apos;envoi
                                        automatique est activé pour le client.
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="scope">{t.messaging.ui.scope}</Label>
                                <Select value={formScope} onValueChange={setFormScope}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">{t.messaging.ui.global}</SelectItem>
                                        <SelectItem value="client">{t.messaging.ui.clientSpecific}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {formScope === 'client' && (
                            <div>
                                <Label htmlFor="client">Client</Label>
                                <Select value={formClientId} onValueChange={setFormClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t.messaging.ui.selectClient} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="default"
                                    checked={formIsDefault}
                                    onCheckedChange={setFormIsDefault}
                                />
                                <Label htmlFor="default">{t.messaging.ui.setDefault}</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="active"
                                    checked={formStatus === 'active'}
                                    onCheckedChange={(checked) => setFormStatus(checked ? 'active' : 'inactive')}
                                />
                                <Label htmlFor="active">{t.messaging.ui.active}</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={formSaving}>
                            {formSaving ? 'Saving...' : 'Save Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={templateToDelete !== null}
                onOpenChange={open => { if (!open) setTemplateToDelete(null); }}
                title={t.messaging.ui.deleteTemplateTitle}
                description={
                    <>
                        <strong>{templateToDelete?.name}</strong> sera supprimé.
                        {templateToDelete?.category?.startsWith('expedition:') && (
                            <> Les notifications automatiques qui l&apos;utilisent cesseront d&apos;être envoyées.</>
                        )}
                    </>
                }
                confirmLabel="Supprimer"
                onConfirm={async () => {
                    if (templateToDelete) await handleDelete(templateToDelete.id);
                    setTemplateToDelete(null);
                }}
            />
        </div>
    );
}
