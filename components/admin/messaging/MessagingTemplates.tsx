'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Mail, MessageCircle, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

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
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(true);
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
    const [clients, setClients] = useState<any[]>([]);

    const [filterClientId, setFilterClientId] = useState<string>('all');

    useEffect(() => {
        loadTemplates();
        loadClients();
    }, [activeTab, filterClientId]);

    const loadClients = async () => {
        try {
            const res = await fetch('/api/admin/users/clients');
            if (res.ok) {
                const data = await res.json();
                setClients(data.clients || []);
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    };

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/templates?type=${activeTab}${filterClientId !== 'all' ? `&clientId=${filterClientId}` : ''}`);
            if (!res.ok) throw new Error('Failed to load templates');
            const data = await res.json();
            setTemplates(data.templates || []);
        } catch (error) {
            toast.error('Failed to load templates');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

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
        // @ts-ignore - template might have clientId
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
        } catch (error: any) {
            toast.error(error.message || 'Failed to save template');
        } finally {
            setFormSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/templates/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete template');

            toast.success('Template deleted');
            loadTemplates();
        } catch (error) {
            toast.error('Failed to delete template');
        }
    };

    const filteredTemplates = templates.filter(t => {
        if (t.type !== activeTab) return false;
        if (filterClientId !== 'all' && filterClientId) {
            // Show global templates + specific client templates
            // OR strictly filter by client owner?
            // "Filter by Client" suggests seeing what a client has access to or owns.
            // Let's show ONLY templates owned by this client + Global ones?
            // User request: "more cleaner between templates and messaging config".
            // Seeing only what belongs to the client makes sense.
            return t.clientId === filterClientId || t.scope === 'global';
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
                    <Button variant="outline" size="icon" onClick={loadTemplates} disabled={loading}>
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
                                <SelectValue placeholder="Filter by Client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Clients</SelectItem>
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
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Scope</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Usage</TableHead>
                                        <TableHead>Last Used</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center">Loading...</TableCell>
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
                                                    <Badge variant="outline">{template.category || 'N/A'}</Badge>
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
                                                            onClick={() => handleDelete(template.id, template.name)}
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
                            <Label htmlFor="name">Template Name *</Label>
                            <Input
                                id="name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g., Welcome Email"
                            />
                        </div>

                        {activeTab === 'email' && (
                            <div>
                                <Label htmlFor="subject">Subject *</Label>
                                <Input
                                    id="subject"
                                    value={formSubject}
                                    onChange={(e) => setFormSubject(e.target.value)}
                                    placeholder="e.g., Welcome to {{company}}!"
                                />
                            </div>
                        )}

                        <div>
                            <Label htmlFor="content">Content *</Label>
                            <Textarea
                                id="content"
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                                placeholder={`Hello {{name}},\n\nThank you for your interest!`}
                                rows={8}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Available variables: {'{{name}}'}, {'{{email}}'}, {'{{phone}}'}, {'{{company}}'}, {'{{date}}'}, {'{{time}}'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Select value={formCategory} onValueChange={setFormCategory}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="welcome">Welcome</SelectItem>
                                        <SelectItem value="follow-up">Follow-up</SelectItem>
                                        <SelectItem value="reminder">Reminder</SelectItem>
                                        <SelectItem value="notification">Notification</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="scope">Scope</Label>
                                <Select value={formScope} onValueChange={setFormScope}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">Global</SelectItem>
                                        <SelectItem value="client">Client-specific</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {formScope === 'client' && (
                            <div>
                                <Label htmlFor="client">Client</Label>
                                <Select value={formClientId} onValueChange={setFormClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select client" />
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
                                <Label htmlFor="default">Set as default template</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="active"
                                    checked={formStatus === 'active'}
                                    onCheckedChange={(checked) => setFormStatus(checked ? 'active' : 'inactive')}
                                />
                                <Label htmlFor="active">Active</Label>
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
        </div>
    );
}
