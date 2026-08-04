export const CLAIM_TYPES = ['RECLAMATION', 'REMBOURSEMENT'] as const;
export const CLAIM_ISSUE_TYPES = ['RETARD', 'AVARIE', 'CASSE', 'PERTE'] as const;
export const CLAIM_STATUSES = [
    'NOUVELLE',
    'EN_COURS',
    'INFO_REQUISE',
    'ACCEPTEE',
    'REFUSEE',
    'RESOLUE',
] as const;

export type ClaimType = (typeof CLAIM_TYPES)[number];
export type ClaimIssueType = (typeof CLAIM_ISSUE_TYPES)[number];
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
    RECLAMATION: 'Réclamation',
    REMBOURSEMENT: 'Remboursement',
};

export const CLAIM_ISSUE_TYPE_LABELS: Record<ClaimIssueType, string> = {
    RETARD: 'Retard',
    AVARIE: 'Avarie',
    CASSE: 'Casse',
    PERTE: 'Perte',
};

export const CLAIM_ISSUE_TYPE_DESCRIPTIONS: Record<ClaimIssueType, string> = {
    RETARD: 'Enlèvement ou livraison hors délai',
    AVARIE: 'Marchandise détériorée ou altérée',
    CASSE: 'Produit ou conditionnement cassé',
    PERTE: 'Colis ou marchandise non localisé',
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
    NOUVELLE: 'Nouvelle',
    EN_COURS: 'En cours',
    INFO_REQUISE: 'Informations requises',
    ACCEPTEE: 'Acceptée',
    REFUSEE: 'Refusée',
    RESOLUE: 'Résolue',
};

export const CLAIM_STATUS_STYLES: Record<ClaimStatus, string> = {
    NOUVELLE: 'border-brand-300 bg-brand-50 text-ink-950',
    EN_COURS: 'border-sky-200 bg-sky-50 text-sky-700',
    INFO_REQUISE: 'border-amber-200 bg-amber-50 text-amber-700',
    ACCEPTEE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    REFUSEE: 'border-red-200 bg-red-50 text-red-700',
    RESOLUE: 'border-slate-200 bg-slate-50 text-slate-600',
};

export const OPEN_CLAIM_STATUSES: ClaimStatus[] = ['NOUVELLE', 'EN_COURS', 'INFO_REQUISE', 'ACCEPTEE'];

export function isClaimType(value: unknown): value is ClaimType {
    return typeof value === 'string' && CLAIM_TYPES.includes(value as ClaimType);
}

export function isClaimIssueType(value: unknown): value is ClaimIssueType {
    return typeof value === 'string' && CLAIM_ISSUE_TYPES.includes(value as ClaimIssueType);
}

export function isClaimStatus(value: unknown): value is ClaimStatus {
    return typeof value === 'string' && CLAIM_STATUSES.includes(value as ClaimStatus);
}

export function claimTypeLabel(value: string): string {
    return isClaimType(value) ? CLAIM_TYPE_LABELS[value] : value;
}

export function claimIssueTypeLabel(value: string): string {
    return isClaimIssueType(value) ? CLAIM_ISSUE_TYPE_LABELS[value] : value;
}

export function claimStatusLabel(value: string): string {
    return isClaimStatus(value) ? CLAIM_STATUS_LABELS[value] : value;
}

export function formatClaimAmount(value: number | string | null, locale = 'fr-FR'): string {
    if (value === null || value === '') return '—';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(Number(value));
}
