'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, FileText, FileWarning, FolderOpen, Gauge, Hammer, Loader2, PackageX, Paperclip, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { OperationsMetricRail, OperationsPageHeader } from '@/components/admin/OperationsPage';
import { Pagination } from '@/components/admin/Pagination';
import { useQuery } from '@/lib/hooks/use-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
    CLAIM_STATUSES,
    CLAIM_STATUS_LABELS,
    CLAIM_STATUS_STYLES,
    CLAIM_TYPES,
    CLAIM_TYPE_LABELS,
    CLAIM_ISSUE_TYPES,
    CLAIM_ISSUE_TYPE_LABELS,
    claimIssueTypeLabel,
    claimStatusLabel,
    claimTypeLabel,
    formatClaimAmount,
    isClaimStatus,
    type ClaimIssueType,
    type ClaimStatus,
} from '@/lib/claims';

interface ClaimRow {
    id: string;
    reference: string;
    type: string;
    issueType: string;
    subject: string;
    description: string;
    requestedAmount: number | null;
    status: string;
    publicResponse: string | null;
    internalNote: string | null;
    createdAt: string;
    updatedAt: string;
    client: { id: string; companyName: string };
    expedition: { id: string; reference: string } | null;
    documents?: Array<{ id: string; originalName: string; mimeType: string; size: number; createdAt: string }>;
    _count?: { documents: number };
}

interface ClaimsResponse {
    claims: ClaimRow[];
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
    totals: {
        all: number;
        open: number;
        refunds: number;
        qualityRate: number | null;
        resolutionRate: number;
        operationalVolume: number;
        totalClaims: number;
        byIssue: Record<ClaimIssueType, number>;
    };
}

const PAGE_SIZE = 25;
const EMPTY_TOTALS: ClaimsResponse['totals'] = {
    all: 0,
    open: 0,
    refunds: 0,
    qualityRate: null,
    resolutionRate: 100,
    operationalVolume: 0,
    totalClaims: 0,
    byIssue: { RETARD: 0, AVARIE: 0, CASSE: 0, PERTE: 0 },
};

const ISSUE_ICONS = { RETARD: Clock, AVARIE: PackageX, CASSE: Hammer, PERTE: SearchX } satisfies Record<ClaimIssueType, typeof Clock>;

export function AdminClaimsPage() {
    const [search, setSearch] = React.useState('');
    const [debounced, setDebounced] = React.useState('');
    const [status, setStatus] = React.useState('All');
    const [type, setType] = React.useState('All');
    const [issueType, setIssueType] = React.useState('All');
    const [page, setPage] = React.useState(1);
    const [editing, setEditing] = React.useState<ClaimRow | null>(null);

    React.useEffect(() => {
        const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    const query = useQuery(
        JSON.stringify({ debounced, status, type, issueType, page }),
        async (): Promise<ClaimsResponse> => {
            const params = new URLSearchParams({
                page: String(page), pageSize: String(PAGE_SIZE), status, type, issueType,
                ...(debounced ? { search: debounced } : {}),
            });
            const response = await fetch(`/api/admin/claims?${params}`, { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Chargement impossible.');
            return data as ClaimsResponse;
        },
        {
            onSuccess: result => {
                if (result.claims.length === 0 && result.page > 1) setPage(result.pageCount);
            },
            onError: error => toast.error(error.message || 'Chargement impossible.'),
            // Litiges move between colleagues; keep the queue current.
            refreshMs: 30_000,
        },
    );

    const { loading, reload: load } = query;
    const claims: ClaimRow[] = query.data?.claims ?? [];
    const totals: ClaimsResponse['totals'] = query.data?.totals ?? EMPTY_TOTALS;
    const paging = {
        total: query.data?.total ?? 0,
        pageCount: query.data?.pageCount ?? 1,
        pageSize: query.data?.pageSize ?? PAGE_SIZE,
    };

    return (
        <div className="space-y-6">
            <OperationsPageHeader code="QSE / LITIGES" title="Litiges & qualité de service" description="Pilotez les incidents transport, leurs pièces justificatives et leur résolution depuis un poste de contrôle unique." />
            <OperationsMetricRail loading={loading} items={[
                { label: 'Dossiers', value: totals.all, icon: FolderOpen },
                { label: 'À résoudre', value: totals.open, icon: FileWarning },
                { label: 'Qualité de service', value: totals.qualityRate === null ? '—' : `${totals.qualityRate.toLocaleString('fr-FR')} %`, icon: Gauge },
            ]} />

            <section className="overflow-hidden rounded-2xl border border-ink-950/[0.08] bg-ink-950 text-white shadow-[0_16px_50px_rgba(10,10,10,.1)]" aria-label="Indicateurs par type de litige">
                <div className="grid lg:grid-cols-[1fr_18rem]">
                    <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0">
                        {CLAIM_ISSUE_TYPES.map(value => {
                            const Icon = ISSUE_ICONS[value];
                            const active = issueType === value;
                            return <button key={value} type="button" aria-pressed={active} onClick={() => { setIssueType(active ? 'All' : value); setPage(1); }} className={`group min-h-28 p-4 text-left transition-colors ${active ? 'bg-brand-500 text-ink-950' : 'hover:bg-white/[0.06]'}`}><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-ink-950 text-brand-500' : 'bg-white/10 text-brand-500'}`}><Icon className="h-4 w-4" /></span><span className={`font-mono text-2xl font-semibold ${active ? 'text-ink-950' : 'text-white'}`}>{totals.byIssue[value]}</span></div><p className={`mt-4 text-[10px] font-bold uppercase tracking-[0.16em] ${active ? 'text-ink-950/60' : 'text-white/45'}`}>{CLAIM_ISSUE_TYPE_LABELS[value]}</p></button>;
                        })}
                    </div>
                    <div className="border-t border-white/10 bg-white/[0.045] p-5 lg:border-l lg:border-t-0">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Résolution</span><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
                        <p className="mt-2 font-mono text-2xl font-semibold">{totals.resolutionRate.toLocaleString('fr-FR')} %</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${Math.min(100, totals.resolutionRate)}%` }} /></div>
                        <p className="mt-3 text-[10px] leading-4 text-white/40">Qualité calculée sur {totals.operationalVolume.toLocaleString('fr-FR')} expéditions consolidées.</p>
                    </div>
                </div>
            </section>

            <Card className="overflow-hidden border-ink-950/[0.08] py-0">
                <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 border-b border-ink-950/[0.07] pb-4 lg:flex-row lg:items-center" role="search">
                        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} className="bg-white pl-9" placeholder="Référence, objet, client ou expédition…" aria-label="Rechercher un dossier" /></div>
                        <Select value={status} onValueChange={value => { setStatus(value); setPage(1); }}><SelectTrigger className="w-full bg-white lg:w-52"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="All">Tous les statuts</SelectItem>{CLAIM_STATUSES.map(value => <SelectItem key={value} value={value}>{CLAIM_STATUS_LABELS[value]}</SelectItem>)}</SelectContent></Select>
                        <Select value={type} onValueChange={value => { setType(value); setPage(1); }}><SelectTrigger className="w-full bg-white lg:w-48"><SelectValue placeholder="Nature" /></SelectTrigger><SelectContent><SelectItem value="All">Toutes les natures</SelectItem>{CLAIM_TYPES.map(value => <SelectItem key={value} value={value}>{CLAIM_TYPE_LABELS[value]}</SelectItem>)}</SelectContent></Select>
                    </div>

                    <div className="hidden overflow-hidden rounded-xl border border-ink-950/[0.08] md:block">
                        <Table><TableHeader><TableRow><TableHead>Référence</TableHead><TableHead>Client</TableHead><TableHead>Objet</TableHead><TableHead>Expédition</TableHead><TableHead>Litige</TableHead><TableHead>Statut</TableHead><TableHead>Pièces</TableHead><TableHead>Créée</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>
                            {loading ? <TableRow><TableCell colSpan={9} className="h-28 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Chargement…</TableCell></TableRow> : claims.length === 0 ? <TableRow><TableCell colSpan={9} className="h-28 text-center text-sm text-slate-500">Aucun dossier ne correspond à ces critères.</TableCell></TableRow> : claims.map(claim => <TableRow key={claim.id}>
                                <TableCell><button onClick={() => setEditing(claim)} className="font-mono text-xs font-semibold hover:underline">{claim.reference}</button></TableCell>
                                <TableCell><Link href={`/admin/clients/${claim.client.id}`} className="text-sm hover:underline">{claim.client.companyName}</Link></TableCell>
                                <TableCell className="max-w-64 truncate text-sm font-medium">{claim.subject}</TableCell>
                                <TableCell className="font-mono text-xs text-slate-500">{claim.expedition?.reference || '—'}</TableCell>
                                <TableCell><p className="text-xs font-semibold">{claimIssueTypeLabel(claim.issueType)}</p><p className="text-[10px] text-slate-400">{claimTypeLabel(claim.type)}</p></TableCell>
                                <TableCell><ClaimBadge status={claim.status} /></TableCell>
                                <TableCell className="text-xs text-slate-500">{claim._count?.documents ? <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {claim._count.documents}</span> : '—'}</TableCell>
                                <TableCell className="text-xs text-slate-500">{new Date(claim.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell><Button variant="ghost" size="icon-sm" onClick={() => setEditing(claim)} aria-label={`Traiter ${claim.reference}`}><SlidersHorizontal className="h-4 w-4" /></Button></TableCell>
                            </TableRow>)}</TableBody></Table>
                    </div>

                    <div className="grid gap-3 md:hidden">{!loading && claims.map(claim => <button key={claim.id} onClick={() => setEditing(claim)} className="rounded-xl border border-ink-950/[0.08] bg-white p-4 text-left"><div className="flex items-start justify-between gap-3"><span className="font-mono text-xs font-semibold">{claim.reference}</span><ClaimBadge status={claim.status} /></div><p className="mt-3 font-semibold">{claim.subject}</p><p className="mt-1 text-xs text-slate-500">{claim.client.companyName} · {claimIssueTypeLabel(claim.issueType)} · {claimTypeLabel(claim.type)}</p></button>)}</div>

                    <Pagination page={page} pageCount={paging.pageCount} total={paging.total} pageSize={paging.pageSize} shown={claims.length} onPageChange={setPage} disabled={loading} noun="dossier" />
                </CardContent>
            </Card>

            {editing && <ClaimReviewDialog key={editing.id} claim={editing} open onOpenChange={open => !open && setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
        </div>
    );
}

function ClaimBadge({ status }: { status: string }) {
    const style = isClaimStatus(status) ? CLAIM_STATUS_STYLES[status] : '';
    return <Badge variant="outline" className={style}>{claimStatusLabel(status)}</Badge>;
}

function ClaimReviewDialog({ claim, open, onOpenChange, onSaved }: {
    claim: ClaimRow;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) {
    const [status, setStatus] = React.useState<ClaimStatus>(isClaimStatus(claim.status) ? claim.status : 'NOUVELLE');
    const [publicResponse, setPublicResponse] = React.useState(claim.publicResponse || '');
    const [internalNote, setInternalNote] = React.useState(claim.internalNote || '');
    const [saving, setSaving] = React.useState(false);

    async function save() {
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/claims/${claim.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, publicResponse, internalNote }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Mise à jour impossible.');
            toast.success(`${claim.reference} mis à jour`);
            onSaved();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{claim.reference}</span><Badge className="border-brand-300 bg-brand-50 text-ink-950">{claimIssueTypeLabel(claim.issueType)}</Badge><Badge variant="outline">{claimTypeLabel(claim.type)}</Badge></div><DialogTitle className="text-xl">{claim.subject}</DialogTitle><DialogDescription>{claim.client.companyName}{claim.expedition ? ` · ${claim.expedition.reference}` : ' · Demande générale'}</DialogDescription></DialogHeader>
                <div className="grid gap-5 md:grid-cols-[1fr_15rem]">
                    <div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Demande du client</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{claim.description}</p></div>
                    <div className="space-y-3 rounded-xl border border-ink-950/[0.08] p-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Ouvert le</p><p className="mt-1 text-sm font-medium">{new Date(claim.createdAt).toLocaleString('fr-FR')}</p></div>{claim.requestedAmount !== null && <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Montant demandé</p><p className="mt-1 font-mono text-lg font-semibold text-sky-700">{formatClaimAmount(claim.requestedAmount)}</p></div>}</div>
                </div>
                {claim.documents && claim.documents.length > 0 && <div className="space-y-2"><Label className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-slate-400" /> Documents justificatifs</Label><div className="grid gap-2 sm:grid-cols-2">{claim.documents.map(document => <a key={document.id} href={`/api/admin/claims/${claim.id}/documents/${document.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-ink-950/[0.08] p-3 transition-colors hover:border-ink-950/20 hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-950 text-brand-500"><FileText className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{document.originalName}</span><span className="text-[10px] text-slate-400">{(document.size / 1024 / 1024).toFixed(1)} Mo</span></span></a>)}</div></div>}
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Statut du dossier</Label><Select value={status} onValueChange={value => setStatus(value as ClaimStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CLAIM_STATUSES.map(value => <SelectItem key={value} value={value}>{CLAIM_STATUS_LABELS[value]}</SelectItem>)}</SelectContent></Select></div>
                    <div className="hidden sm:block" />
                    <div className="space-y-2"><Label htmlFor="claim-public-response">Réponse visible par le client</Label><Textarea id="claim-public-response" value={publicResponse} onChange={event => setPublicResponse(event.target.value)} maxLength={5000} className="min-h-32 resize-y" placeholder="Expliquez la décision ou demandez les informations manquantes…" /></div>
                    <div className="space-y-2"><Label htmlFor="claim-internal-note">Note interne</Label><Textarea id="claim-internal-note" value={internalNote} onChange={event => setInternalNote(event.target.value)} maxLength={10000} className="min-h-32 resize-y bg-amber-50/40" placeholder="Contexte réservé à l’équipe ULS…" /><p className="text-[10px] text-slate-600">Cette note n’apparaît jamais dans l’espace client.</p></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button variant="signal" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer la décision</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
