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

/** Legal forward transitions in the operational shipment workflow. */
export const EXPEDITION_TRANSITIONS: Record<ExpeditionStatus, ExpeditionStatus[]> = {
    Demandee: ['Planifiee', 'Annulee'],
    Planifiee: ['Enlevee', 'Annulee'],
    Enlevee: ['En transit', 'Annulee'],
    'En transit': ['Livree', 'Annulee'],
    Livree: [],
    Annulee: [],
};

export function allowedExpeditionTransitions(status: string): ExpeditionStatus[] {
    return EXPEDITION_STATUS_VALUES.includes(status)
        ? EXPEDITION_TRANSITIONS[status as ExpeditionStatus]
        : [];
}

export function canTransitionExpedition(from: string, to: string): boolean {
    return from === to || allowedExpeditionTransitions(from).includes(to as ExpeditionStatus);
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

// ── Message template categories ───────────────────────────────────────

/**
 * A template whose category is one of the `expedition:*` values below is
 * sent automatically when the matching thing happens to a shipment — see
 * `lib/server/expedition-notifications.ts`. Everything else is a manual
 * template, only ever sent from the compose screen.
 */
export const EXPEDITION_TEMPLATE_CATEGORIES: { value: string; label: string }[] = [
    { value: 'expedition:created', label: 'Expédition — créée' },
    ...EXPEDITION_STATUSES.map(s => ({
        value: `expedition:${s.value}`,
        label: `Expédition — ${s.label}`,
    })),
];

/** Free-form categories, used to group templates in the picker. */
export const MANUAL_TEMPLATE_CATEGORIES: { value: string; label: string }[] = [
    { value: 'welcome', label: 'Bienvenue' },
    { value: 'follow-up', label: 'Relance' },
    { value: 'reminder', label: 'Rappel' },
    { value: 'notification', label: 'Notification' },
];

export const TEMPLATE_CATEGORIES: { value: string; label: string }[] = [
    ...MANUAL_TEMPLATE_CATEGORIES,
    ...EXPEDITION_TEMPLATE_CATEGORIES,
];

export function templateCategoryLabel(value: string | null | undefined): string {
    if (!value) return 'Autre';
    return TEMPLATE_CATEGORIES.find(c => c.value === value)?.label ?? value;
}

/**
 * The template category that governs a shipment event: its creation, or the
 * status it has just moved to.
 */
export function expeditionTemplateCategory(event: 'created' | string): string {
    return `expedition:${event}`;
}

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
    'transport-urgent': 'Urgent',
    'vehicules-avec-chauffeurs': 'Véhicule + chauffeur',
    'tournees-regulieres': 'Tournée régulière',
    'transport-frigorifique': 'Frigorifique',
    'plateaux-bras-de-grue': 'Plateau / grue',
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

/**
 * Amounts are always in euros — ULS invoices in euros whatever the reader's
 * language — but the grouping and decimal separator follow the interface
 * locale, so an English reader sees €1,234.56 rather than 1 234,56 €.
 */
export function formatEuros(
    value: number | null | undefined,
    locale: string = 'fr-FR'
): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
    }).format(value);
}
