'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleDollarSign, Clock, FileText, FileUp, FileWarning, Hammer, Loader2, PackageX, SearchX, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    CLAIM_ISSUE_TYPES,
    CLAIM_ISSUE_TYPE_DESCRIPTIONS,
    CLAIM_ISSUE_TYPE_LABELS,
    type ClaimIssueType,
    type ClaimType,
} from '@/lib/claims';

interface ExpeditionOption {
    id: string;
    reference: string;
    pickupCity: string | null;
    deliveryCity: string | null;
}

export function ClientClaimForm({ expeditions, initialExpeditionId = '' }: {
    expeditions: ExpeditionOption[];
    initialExpeditionId?: string;
}) {
    const router = useRouter();
    const [type, setType] = useState<ClaimType>('RECLAMATION');
    const [issueType, setIssueType] = useState<ClaimIssueType>('RETARD');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [expeditionId, setExpeditionId] = useState(initialExpeditionId);
    const [requestedAmount, setRequestedAmount] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);

    /**
     * Send one document: ask for a grant, PUT the file straight at storage, then
     * record it. The bytes never pass through our own API — a serverless request
     * body tops out at 4.5 MB, below the 8 MB a claimant is allowed.
     */
    async function uploadDocument(claimId: string, file: File): Promise<string | null> {
        /** Read the server's own message, so the reason survives to the toast. */
        const reason = async (response: Response, step: string) => {
            let detail = '';
            try {
                const body = await response.clone().json();
                detail = typeof body?.error === 'string' ? body.error : '';
            } catch {
                detail = (await response.clone().text().catch(() => '')).slice(0, 120);
            }
            const message = `${step} (${response.status})${detail ? ` : ${detail}` : ''}`;
            console.error(`[upload] ${file.name} — ${message}`);
            return message;
        };

        try {
            const grantResponse = await fetch(`/api/client/claims/${claimId}/documents/upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contentType: file.type, size: file.size }),
            });
            if (!grantResponse.ok) return await reason(grantResponse, 'autorisation refusée');
            const { uploadUrl, key } = await grantResponse.json();

            let stored: Response;
            try {
                stored = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file,
                });
            } catch (error) {
                // A PUT straight to storage is cross-origin, so a blocked CORS
                // preflight surfaces here as a network error with no status at
                // all — worth naming, because it looks like nothing happened.
                const message = `transfert bloqué (réseau/CORS) : ${error instanceof Error ? error.message : 'inconnu'}`;
                console.error(`[upload] ${file.name} — ${message}`, { uploadUrl });
                return message;
            }
            if (!stored.ok) return await reason(stored, 'dépôt refusé par le stockage');

            const finalized = await fetch(`/api/client/claims/${claimId}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, originalName: file.name, contentType: file.type }),
            });
            if (!finalized.ok) return await reason(finalized, 'enregistrement refusé');

            return null;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'erreur inconnue';
            console.error(`[upload] ${file.name} — ${message}`);
            return message;
        }
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch('/api/client/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, issueType, subject, description, expeditionId, requestedAmount }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Création impossible.');
            const failures: string[] = [];
            for (const file of files) {
                const failure = await uploadDocument(data.claim.id, file);
                if (failure) failures.push(`${file.name} — ${failure}`);
            }
            if (failures.length) {
                // Say what went wrong, not just how many. A bare count leaves
                // the claimant with nothing to report and us with nothing to act on.
                toast.warning(
                    `Dossier créé, mais ${failures.length} document(s) n’ont pas pu être envoyé(s).`,
                    { description: failures.join(' · '), duration: 12000 },
                );
            } else {
                toast.success(`Dossier ${data.claim.reference} créé`);
            }
            router.push(`/espace-client/reclamations/${data.claim.id}`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Création impossible.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-6">
            <fieldset>
                <legend className="mb-3 text-sm font-semibold">Type de litige</legend>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {CLAIM_ISSUE_TYPES.map(value => {
                        const Icon = { RETARD: Clock, AVARIE: PackageX, CASSE: Hammer, PERTE: SearchX }[value];
                        const selected = issueType === value;
                        return (
                            <button key={value} type="button" aria-pressed={selected} onClick={() => setIssueType(value)} className={cn(
                                'group rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/30',
                                selected ? 'border-brand-500 bg-brand-50 shadow-[inset_0_-2px_0_#fde718]' : 'border-ink-950/10 bg-white hover:border-ink-950/25',
                            )}>
                                <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', selected ? 'bg-ink-950 text-brand-500' : 'bg-ink-950/[0.055] text-slate-500')}><Icon className="h-4 w-4" /></span>
                                <span className="mt-3 block text-sm font-semibold">{CLAIM_ISSUE_TYPE_LABELS[value]}</span>
                                <span className="mt-1 block text-[11px] leading-4 text-slate-500">{CLAIM_ISSUE_TYPE_DESCRIPTIONS[value]}</span>
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <fieldset>
                <legend className="mb-3 text-sm font-semibold">Nature de la demande</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                    {([
                        { value: 'RECLAMATION' as const, label: 'Réclamation', detail: 'Signaler un problème de transport', icon: FileWarning },
                        { value: 'REMBOURSEMENT' as const, label: 'Remboursement', detail: 'Demander une compensation financière', icon: CircleDollarSign },
                    ]).map(item => (
                        <button key={item.value} type="button" aria-pressed={type === item.value} onClick={() => setType(item.value)} className={cn(
                            'flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/30',
                            type === item.value ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-950/10 bg-white hover:border-ink-950/25',
                        )}>
                            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', type === item.value ? 'bg-brand-500 text-ink-950' : 'bg-ink-950/[0.055]')}><item.icon className="h-5 w-5" /></span>
                            <span><span className="block font-semibold">{item.label}</span><span className={cn('mt-1 block text-xs', type === item.value ? 'text-white/55' : 'text-slate-500')}>{item.detail}</span></span>
                        </button>
                    ))}
                </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="claim-subject">Objet</Label>
                    <Input id="claim-subject" value={subject} onChange={event => setSubject(event.target.value)} minLength={5} maxLength={160} required placeholder="Ex. Marchandise endommagée à la livraison" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="claim-expedition">Expédition concernée <span className="font-normal text-slate-400">(facultatif)</span></Label>
                    <select id="claim-expedition" value={expeditionId} onChange={event => setExpeditionId(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus:border-ink-950 focus:ring-3 focus:ring-brand-500/25">
                        <option value="">Demande générale</option>
                        {expeditions.map(expedition => <option key={expedition.id} value={expedition.id}>{expedition.reference} · {expedition.pickupCity || '?'} → {expedition.deliveryCity || '?'}</option>)}
                    </select>
                </div>
                {type === 'REMBOURSEMENT' && (
                    <div className="space-y-2">
                        <Label htmlFor="claim-amount">Montant demandé</Label>
                        <div className="relative"><Input id="claim-amount" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" value={requestedAmount} onChange={event => setRequestedAmount(event.target.value)} required className="pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">EUR</span></div>
                    </div>
                )}
                <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between gap-3"><Label htmlFor="claim-description">Description détaillée</Label><span className="text-[10px] tabular-nums text-slate-400">{description.length}/5000</span></div>
                    <Textarea id="claim-description" value={description} onChange={event => setDescription(event.target.value)} minLength={20} maxLength={5000} required className="min-h-40 resize-y" placeholder="Décrivez les faits, les dates utiles et la solution attendue…" />
                </div>
                <div className="space-y-3 sm:col-span-2">
                    <div><Label>Documents justificatifs <span className="font-normal text-slate-400">(facultatif)</span></Label><p className="mt-1 text-xs text-slate-500">Bon de livraison, réserves, facture ou photos — PDF, JPG, PNG ou WebP, 8 Mo maximum.</p></div>
                    <label htmlFor="claim-documents" className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-950/20 bg-slate-50/60 px-4 text-center transition-colors hover:border-ink-950/40 hover:bg-brand-50/50">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm"><FileUp className="h-5 w-5 text-slate-500" /></span>
                        <span className="text-left"><span className="block text-sm font-semibold">Ajouter des justificatifs</span><span className="block text-xs text-slate-500">{files.length}/5 documents sélectionnés</span></span>
                    </label>
                    <input id="claim-documents" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={event => {
                        const selected = Array.from(event.currentTarget.files || []);
                        const accepted = selected.filter(file => file.size <= 8 * 1024 * 1024 && ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type));
                        if (accepted.length !== selected.length) toast.error('Certains fichiers ne respectent pas le format ou la limite de 8 Mo.');
                        setFiles(current => [...current, ...accepted].slice(0, 5));
                        event.currentTarget.value = '';
                    }} />
                    {files.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 rounded-xl border border-ink-950/[0.08] bg-white p-3"><FileText className="h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{file.name}</p><p className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} Mo</p></div><button type="button" onClick={() => setFiles(current => current.filter((_, fileIndex) => fileIndex !== index))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Retirer ${file.name}`}><X className="h-4 w-4" /></button></div>)}</div>}
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-slate-500">Votre dossier sera horodaté et transmis à l’équipe ULS. Vous pourrez suivre la réponse depuis cet espace.</p>
                <Button type="submit" variant="signal" disabled={submitting} className="sm:min-w-48">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Créer le dossier
                </Button>
            </div>
        </form>
    );
}
