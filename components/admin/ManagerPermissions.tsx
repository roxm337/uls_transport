'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Shield, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManagerPermissionsProps {
    userId: string;
    userRole: string;
}

interface Section {
    path: string;
    label: string;
    description: string;
}

const AVAILABLE_SECTIONS: Section[] = [
    { path: '/admin', label: 'Dashboard', description: 'Overview and statistics' },
    { path: '/admin/clients', label: 'Clients', description: 'Consulter et gérer les clients' },
    { path: '/admin/expeditions', label: 'Expéditions', description: 'Consulter et gérer les expéditions' },
    { path: '/admin/analytics', label: 'Analytique', description: 'Consulter les statistiques' },
    { path: '/admin/users', label: 'Équipe', description: 'Gérer les comptes internes' },
    { path: '/admin/messaging', label: 'Messagerie', description: 'Configuration e-mail et WhatsApp' },
    { path: '/admin/logs', label: 'Journaux', description: 'Consulter les journaux système' },
    { path: '/admin/settings', label: 'Réglages', description: 'Paramètres de l’application' },
];

export function ManagerPermissions({ userId, userRole }: ManagerPermissionsProps) {
    const [allowedSections, setAllowedSections] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (userRole === 'MANAGER') {
            fetchPermissions();
        }
    }, [userId, userRole]);

    const fetchPermissions = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/permissions`);
            if (response.ok) {
                const data = await response.json();
                setAllowedSections(data.allowedSections || []);
            } else {
                toast.error('Failed to load permissions');
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
            toast.error('Failed to load permissions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleSection = (sectionPath: string) => {
        setAllowedSections(prev => {
            const newSections = prev.includes(sectionPath)
                ? prev.filter(s => s !== sectionPath)
                : [...prev, sectionPath];
            setHasChanges(true);
            return newSections;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowedSections })
            });

            if (response.ok) {
                toast.success('Permissions updated successfully');
                setHasChanges(false);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to update permissions');
            }
        } catch (error) {
            console.error('Error updating permissions:', error);
            toast.error('Failed to update permissions');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        fetchPermissions();
        setHasChanges(false);
    };

    if (userRole !== 'MANAGER') {
        return null;
    }

    if (isLoading) {
        return (
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        Permissions
                    </CardTitle>
                    <CardDescription>Loading permissions...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        Section Access
                    </CardTitle>
                    <CardDescription>
                        Configure which sections this manager can see
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {AVAILABLE_SECTIONS.map((section) => {
                            const isChecked = allowedSections.includes(section.path);
                            return (
                                <div
                                    key={section.path}
                                    className={cn(
                                        "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                                        isChecked
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-slate-50 border-slate-200"
                                    )}
                                >
                                    <Checkbox
                                        id={section.path}
                                        checked={isChecked}
                                        onCheckedChange={() => handleToggleSection(section.path)}
                                        className="mt-0.5"
                                    />
                                    <div className="flex-1 space-y-0.5">
                                        <Label
                                            htmlFor={section.path}
                                            className="text-sm font-medium cursor-pointer flex items-center gap-2"
                                        >
                                            {section.label}
                                            {isChecked && (
                                                <Check className="h-3.5 w-3.5 text-blue-600" />
                                            )}
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                            {section.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {hasChanges && (
                <div className="flex items-center justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white/95 backdrop-blur p-4 rounded-lg shadow-lg border">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save All Permissions'
                        )}
                    </Button>
                </div>
            )}
            {!hasChanges && (
                <div className="text-xs text-slate-500 text-center pt-2">
                    {allowedSections.length} sections enabled
                </div>
            )}
        </div>
    );
}
