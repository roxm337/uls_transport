import { SERVICES } from '@/lib/brand';

/**
 * Domain vocabulary for the ULS Transport CRM.
 * Values stored in the database are ASCII-safe; labels are what staff see.
 */

// ── Client lifecycle ──────────────────────────────────────────────────

export const CLIENT_STATUSES: string[] = ['Prospect', 'Actif', 'Inactif', 'Suspendu'];
export type ClientStatus = 'Prospect' | 'Actif' | 'Inactif' | 'Suspendu';

/** Tailwind classes per client status — ULS yellow marks the active state. */
export const CLIENT_STATUS_STYLES: Record<string, string> = {
    Prospect: 'bg-sky-50 text-sky-700 border-sky-200',
    Actif: 'bg-brand-100 text-ink-950 border-brand-300',
    Inactif: 'bg-slate-100 text-slate-600 border-slate-200',
    Suspendu: 'bg-red-50 text-red-700 border-red-200',
};

// ── Expedition lifecycle ──────────────────────────────────────────────

/** Stored value → display label (accents live only in the label). */
export const EXPEDITION_STATUSES = [
    { value: 'Demandee', label: 'Demandée' },
    { value: 'Planifiee', label: 'Planifiée' },
    { value: 'Enlevee', label: 'Enlevée' },
    { value: 'En transit', label: 'En transit' },
    { value: 'Livree', label: 'Livrée' },
    { value: 'Annulee', label: 'Annulée' },
] as const;

export type ExpeditionStatus = (typeof EXPEDITION_STATUSES)[number]['value'];

export const EXPEDITION_STATUS_VALUES: string[] = EXPEDITION_STATUSES.map(s => s.value);

export function expeditionStatusLabel(value: string): string {
    return EXPEDITION_STATUSES.find(s => s.value === value)?.label ?? value;
}

export const EXPEDITION_STATUS_STYLES: Record<string, string> = {
    Demandee: 'bg-slate-100 text-slate-700 border-slate-200',
    Planifiee: 'bg-sky-50 text-sky-700 border-sky-200',
    Enlevee: 'bg-amber-50 text-amber-700 border-amber-200',
    'En transit': 'bg-brand-100 text-ink-950 border-brand-300',
    Livree: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Annulee: 'bg-red-50 text-red-700 border-red-200',
};

/** Statuses that mean the job is finished and billable. */
export const EXPEDITION_COMPLETED: string[] = ['Livree'];
/** Statuses that mean the job is still running. */
export const EXPEDITION_ACTIVE: string[] = ['Demandee', 'Planifiee', 'Enlevee', 'En transit'];

// ── ULS services ──────────────────────────────────────────────────────

export const SERVICE_OPTIONS: { value: string; label: string }[] =
    SERVICES.map(s => ({ value: s.slug, label: s.title }));

// Widened to string[] on purpose: these are validated against untyped
// request bodies, so a literal tuple would reject every `.includes(input)`.
export const SERVICE_SLUGS: string[] = SERVICES.map(s => s.slug);

export function serviceLabel(slug: string): string {
    return SERVICES.find(s => s.slug === slug)?.title ?? slug;
}

/** Short label for tables and chips, where the full title is too long. */
export const SERVICE_SHORT: Record<string, string> = {
    'messagerie-nationale-internationale': 'Messagerie',
    'transport-urgent': 'Urgent',
    'vehicules-avec-chauffeurs': 'Véhicule + chauffeur',
    'tournees-regulieres': 'Tournée régulière',
    'transport-frigorifique': 'Frigorifique',
    'plateaux-bras-de-grue': 'Plateau / grue',
    'demenagement': 'Déménagement',
    'benne-aluminium-acier': 'Benne',
    'citernes-pulverulentes': 'Citerne',
};

export function serviceShortLabel(slug: string): string {
    return SERVICE_SHORT[slug] ?? serviceLabel(slug);
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Parse the JSON array stored in Client.services, tolerating bad data. */
export function parseServices(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : [];
    } catch {
        return [];
    }
}

export function formatEuros(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
    }).format(value);
}
