'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock, Mail, MapPin, PackageCheck, ShieldCheck } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function ClientLoginPage() {
    const router = useRouter();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/client/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || 'Connexion impossible.');
            router.push('/espace-client');
            router.refresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Connexion impossible.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="grid min-h-dvh bg-[#f4f5f2] lg:grid-cols-[1.04fr_.96fr]">
            <section className="route-grid relative hidden min-h-dvh overflow-hidden bg-ink-950 p-10 text-white lg:flex lg:flex-col">
                <div className="absolute -right-24 top-8 h-96 w-96 rounded-full bg-brand-500/[0.08] blur-3xl" />
                <Link href="/" className="relative inline-flex h-12 w-36 items-center justify-center rounded-xl bg-brand-500 px-3">
                    <Image src={BRAND.logo} alt={BRAND.name} width={404} height={282} priority className="h-10 w-auto object-contain" />
                </Link>

                <div className="relative my-auto max-w-2xl py-16">
                    <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-500">Espace client sécurisé</p>
                    <h1 className="max-w-xl text-[clamp(2.8rem,5vw,5.8rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
                        Votre transport, sans zone d’ombre.
                    </h1>
                    <p className="mt-6 max-w-md text-base leading-7 text-white/55">
                        Retrouvez chaque départ, chaque étape et chaque livraison depuis un espace réservé à votre entreprise.
                    </p>

                    <div className="mt-12 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div><MapPin className="mb-2 h-4 w-4 text-brand-500" /><p className="font-semibold">Votre site</p><p className="text-xs text-white/35">Enlèvement confirmé</p></div>
                            <div className="relative h-px flex-1 bg-white/10"><span className="absolute inset-y-0 left-0 w-2/3 bg-brand-500" /></div>
                            <div className="text-right"><PackageCheck className="mb-2 ml-auto h-4 w-4 text-white/35" /><p className="font-semibold">Destination</p><p className="text-xs text-white/35">Suivi en cours</p></div>
                        </div>
                    </div>
                </div>

                <p className="relative text-xs text-white/30">{BRAND.tagline}</p>
            </section>

            <section className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-10">
                <div className="w-full max-w-md">
                    <Link href="/" className="mb-10 inline-flex h-12 w-32 items-center justify-center rounded-xl bg-brand-500 px-2 lg:hidden">
                        <Image src={BRAND.logo} alt={BRAND.name} width={404} height={282} priority className="h-9 w-auto object-contain" />
                    </Link>
                    <span className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-ink-950 text-brand-500"><ShieldCheck className="h-5 w-5" /></span>
                    <h2 className="text-3xl font-semibold tracking-[-0.04em] text-ink-950 sm:text-4xl">Accéder à mon espace</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Utilisez les identifiants transmis par votre interlocuteur ULS.</p>

                    <form onSubmit={submit} className="mt-8 space-y-5">
                        <div className="grid gap-2">
                            <Label htmlFor="client-email">E-mail</Label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input id="client-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="h-12 rounded-xl pl-10" placeholder="vous@entreprise.fr" required />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="client-password">Mot de passe</Label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input id="client-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="h-12 rounded-xl pl-10 pr-11" placeholder="••••••••••••" required />
                                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink-950" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                        <Button type="submit" variant="signal" size="lg" className="h-12 w-full" disabled={loading}>
                            {loading ? <><Spinner size={18} /> Connexion…</> : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
                        </Button>
                    </form>

                    <div className="mt-8 border-t border-ink-950/10 pt-6 text-xs leading-5 text-slate-400">
                        Accès non reçu ou mot de passe oublié ? Contactez l’exploitation au{' '}
                        <a href={BRAND.contact.phoneHref} className="font-semibold text-ink-950 hover:underline">{BRAND.contact.phone}</a>.
                    </div>
                </div>
            </section>
        </main>
    );
}
