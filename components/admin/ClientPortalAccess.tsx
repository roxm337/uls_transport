'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface PortalAccount {
    exists: boolean;
    email: string;
    enabled: boolean;
    lastLoginAt: string | null;
    createdAt: string | null;
}

export function ClientPortalAccess({ clientId, defaultEmail }: {
    clientId: string;
    defaultEmail?: string | null;
}) {
    const [account, setAccount] = React.useState<PortalAccount | null>(null);
    const [email, setEmail] = React.useState(defaultEmail ?? '');
    const [password, setPassword] = React.useState('');
    const [enabled, setEnabled] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        let active = true;
        fetch(`/api/admin/clients/${clientId}/portal`, { cache: 'no-store' })
            .then(async response => {
                if (!response.ok) throw new Error('Chargement impossible.');
                return response.json() as Promise<{ account: PortalAccount }>;
            })
            .then(({ account: next }) => {
                if (!active) return;
                setAccount(next);
                setEmail(next.email || defaultEmail || '');
                setEnabled(next.enabled);
            })
            .catch(error => toast.error(error instanceof Error ? error.message : 'Chargement impossible.'))
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [clientId, defaultEmail]);

    async function save() {
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/clients/${clientId}/portal`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, enabled }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || 'Enregistrement impossible.');
            setAccount(body.account);
            setPassword('');
            toast.success(account?.exists ? 'Accès client mis à jour.' : 'Accès client créé.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Enregistrement impossible.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card className="overflow-hidden border-ink-950/[0.08] py-0">
            <CardHeader className="border-b border-ink-950/[0.07] bg-ink-950 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-ink-950">
                        <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                        <CardTitle className="text-base text-white">Espace client</CardTitle>
                        <p className="mt-0.5 text-xs text-white/55">Accès au suivi des expéditions de cette société.</p>
                    </div>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-3 border-white/15 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white sm:mt-0">
                    <Link href="/espace-client/login" target="_blank">
                        Ouvrir la connexion <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-5">
                {loading ? (
                    <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                ) : (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                        <div className="grid gap-2">
                            <Label htmlFor="portal-email">E-mail de connexion</Label>
                            <Input id="portal-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="client@entreprise.fr" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="portal-password">
                                {account?.exists ? 'Nouveau mot de passe' : 'Mot de passe'}
                            </Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="portal-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={event => setPassword(event.target.value)}
                                    className="pl-9 pr-10"
                                    placeholder={account?.exists ? 'Laisser vide pour conserver' : '12 caractères minimum'}
                                    autoComplete="new-password"
                                />
                                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink-950" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 lg:pb-0.5">
                            <div className="flex items-center gap-2">
                                <Switch id="portal-enabled" checked={enabled} onCheckedChange={setEnabled} />
                                <Label htmlFor="portal-enabled" className="whitespace-nowrap">Accès actif</Label>
                            </div>
                            <Button variant="signal" onClick={save} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {account?.exists ? 'Enregistrer' : 'Créer l’accès'}
                            </Button>
                        </div>
                    </div>
                )}
                {account?.lastLoginAt && (
                    <p className="mt-4 text-xs text-slate-400">
                        Dernière connexion : {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(account.lastLoginAt))}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
