'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                toast.success('Connexion réussie !');
                router.push('/admin');
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Échec de la connexion');
            }
        } catch {
            toast.error('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-dvh flex-col bg-[#f4f5f2] font-sans selection:bg-brand-500/40 lg:h-dvh lg:flex-row lg:overflow-hidden">

            {/* Left Column */}
            <div className="route-grid relative flex w-full flex-col justify-center overflow-hidden bg-ink-950 px-6 pb-16 pt-10 text-white lg:w-[46%] lg:p-10">

                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-white/10 blur-[60px] rounded-full lg:hidden"></div>
                    <div className="absolute top-[-15%] right-[-5%] w-[45%] h-[45%] bg-white/[0.07] blur-[80px] rounded-full hidden lg:block"></div>
                    <div className="absolute bottom-[-10%] left-[-8%] w-[40%] h-[40%] bg-white/[0.05] blur-[70px] rounded-full hidden lg:block"></div>
                </div>
                <div className="route-dashes absolute inset-x-0 bottom-0 h-1" />

                <div className="relative z-10 w-full max-w-lg mx-auto text-center lg:text-left">
                    <Link href="/" className="mb-7 inline-flex items-center rounded-xl bg-brand-500 px-3 py-2 shadow-[0_12px_34px_rgba(253,231,24,.18)] transition-transform hover:-translate-y-0.5">
                        <Image src={BRAND.logo} alt={`${BRAND.name} logo`} width={404} height={282} priority className="h-10 w-auto object-contain lg:h-12" />
                    </Link>

                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-brand-500">Centre de pilotage</p>
                    <h1 className="mb-3 text-3xl font-bold leading-[1.08] tracking-[-0.035em] lg:text-[2.75rem]">
                        Pilotez vos transports depuis un seul espace.
                    </h1>
                    <p className="text-white/70 text-sm lg:text-base leading-relaxed mb-4 lg:mb-5 max-w-md mx-auto lg:mx-0">
                        Suivez vos demandes d&apos;enlèvement, vos livraisons et vos échanges
                        avec l&apos;exploitation {BRAND.name} — en temps réel, 24/7.
                    </p>

                    <div className="hidden rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-md lg:block">
                        <div className="flex gap-3 mb-4">
                            <div className="w-9 h-9 rounded-full bg-brand-500 text-ink-950 flex items-center justify-center shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm mb-0.5">Suivi en temps réel</h3>
                                <p className="text-white/70 text-xs leading-snug">Tous nos véhicules sont équipés de GSM et de géolocalisation.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-500 text-ink-950 flex items-center justify-center shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm mb-0.5">Couverture nationale</h3>
                                <p className="text-white/70 text-xs leading-snug">Plus de 500 transporteurs partenaires répartis sur toute la France.</p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-3 mt-5">
                        <span className="h-8 w-1 rounded-full bg-brand-500" />
                        <span className="text-xs font-medium text-white/80">
                            {BRAND.tagline}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div className="relative z-20 mt-[-2rem] flex w-full flex-col items-center justify-center rounded-t-[2rem] bg-[#f4f5f2] px-6 py-9 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.15)] sm:px-10 lg:mt-0 lg:w-[54%] lg:overflow-y-auto lg:rounded-none lg:px-14 lg:shadow-none">

                <div className="w-full max-w-[460px] animate-form-in">
                    <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-6 lg:hidden"></div>

                    <div className="mb-7 text-center lg:text-left">

                        <h2 className="mb-1 text-2xl font-bold tracking-[-0.025em] text-zinc-900 lg:text-3xl">Ravi de vous revoir</h2>
                        <p className="text-sm text-zinc-500">Accédez à votre espace d&apos;exploitation sécurisé.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">E-mail</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-[18px] w-[18px] text-zinc-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="block w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-base text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,.025)] outline-none transition-all duration-200 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-ink-950 focus:ring-4 focus:ring-brand-500/20"
                                    placeholder="vous@entreprise.fr"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label htmlFor="password" className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Mot de passe</label>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-[18px] w-[18px] text-zinc-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="block w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-11 text-base text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,.025)] outline-none transition-all duration-200 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-ink-950 focus:ring-4 focus:ring-brand-500/20"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 transition-colors hover:text-zinc-600 focus:outline-none">
                                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-base font-bold text-ink-950 bg-brand-500 hover:bg-brand-400 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/40 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-950 transition-all duration-200 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                        >
                            {loading ? <><Spinner size={18} className="text-white mr-2" />Connexion en cours...</> : <>Se connecter</>}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-zinc-500 lg:text-left">
                        Vous êtes client ?{' '}
                        <Link href="/espace-client/login" className="font-semibold text-ink-950 underline decoration-brand-500 decoration-2 underline-offset-4">
                            Accéder au suivi de vos expéditions
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
