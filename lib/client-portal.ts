export const CLIENT_STATUS_STEPS = ['Demandee', 'Planifiee', 'Enlevee', 'En transit', 'Livree'] as const;

export const CLIENT_STATUS_LABELS: Record<string, string> = {
    Demandee: 'Demandée',
    Planifiee: 'Planifiée',
    Enlevee: 'Enlevée',
    'En transit': 'En transit',
    Livree: 'Livrée',
    Annulee: 'Annulée',
};

export const ACTIVE_EXPEDITION_STATUSES = ['Demandee', 'Planifiee', 'Enlevee', 'En transit'];

export function statusLabel(status: string): string {
    return CLIENT_STATUS_LABELS[status] ?? status;
}

export function statusProgress(status: string): number {
    if (status === 'Annulee') return 0;
    const index = CLIENT_STATUS_STEPS.indexOf(status as typeof CLIENT_STATUS_STEPS[number]);
    return index < 0 ? 0 : ((index + 1) / CLIENT_STATUS_STEPS.length) * 100;
}

export function formatPortalDate(value: Date | string | null | undefined, includeTime = false): string {
    if (!value) return 'À confirmer';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'À confirmer';
    return new Intl.DateTimeFormat('fr-FR', includeTime
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { day: '2-digit', month: 'short', year: 'numeric' }
    ).format(date);
}
