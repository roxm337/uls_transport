/**
 * The admin sections a staff account can be granted.
 *
 * Single source of truth. Before this file existed the list was duplicated in
 * three places (admin layout, sidebar, permissions API) and they had drifted:
 * the layout still granted `/admin/leads`, a route that no longer exists, while
 * omitting Clients and Expeditions — so a MANAGER with no explicit permissions
 * lost the two sections they need most. Import from here, never re-declare.
 */

export const ADMIN_SECTIONS = [
    '/admin',
    '/admin/clients',
    '/admin/expeditions',
    '/admin/analytics',
    '/admin/messaging',
    '/admin/users',
    '/admin/logs',
    '/admin/settings',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

/** Widened to string[]: these are matched against untyped request bodies. */
export const ADMIN_SECTION_VALUES: string[] = [...ADMIN_SECTIONS];

/** Sections no MANAGER may hold, whatever `allowedSections` says. */
export const ADMIN_ONLY_SECTIONS: string[] = [
    '/admin/users',
    '/admin/logs',
    '/admin/settings',
];

/** What a MANAGER gets when nothing has been configured for them. */
export const DEFAULT_MANAGER_SECTIONS: string[] = [
    '/admin',
    '/admin/clients',
    '/admin/expeditions',
    '/admin/messaging',
];

export const SECTION_LABELS: Record<string, string> = {
    '/admin': 'Tableau de bord',
    '/admin/clients': 'Clients',
    '/admin/expeditions': 'Expéditions',
    '/admin/analytics': 'Analytique',
    '/admin/messaging': 'Messagerie',
    '/admin/users': 'Équipe',
    '/admin/logs': 'Logs',
    '/admin/settings': 'Paramètres',
};

export function isAdminSection(value: unknown): value is AdminSection {
    return typeof value === 'string' && ADMIN_SECTION_VALUES.includes(value);
}

/**
 * Resolve the sections a role actually holds.
 *
 * `raw` is `User.allowedSections`, an untyped JSON column: it may be null, a
 * legacy object, or an array with stale entries. Anything unrecognised falls
 * back to the manager defaults rather than granting or denying by accident.
 */
export function resolveSections(role: string, raw: unknown): string[] {
    if (role === 'ADMIN') return [...ADMIN_SECTION_VALUES];

    const stored = Array.isArray(raw)
        ? raw.filter(isAdminSection)
        : [];

    const sections = stored.length > 0 ? stored : DEFAULT_MANAGER_SECTIONS;

    // A MANAGER never holds an admin-only section, however the row was written.
    return sections.filter(s => !ADMIN_ONLY_SECTIONS.includes(s));
}

/**
 * Match a pathname to the section that governs it, longest prefix first, so
 * `/admin/clients/abc` resolves to `/admin/clients` and not `/admin`.
 */
export function sectionForPath(pathname: string): string | null {
    const match = [...ADMIN_SECTION_VALUES]
        .sort((a, b) => b.length - a.length)
        .find(section => pathname === section || pathname.startsWith(`${section}/`));

    return match ?? null;
}
