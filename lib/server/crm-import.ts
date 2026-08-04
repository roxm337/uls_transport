export interface CrmSourceRow {
    rowNumber: number;
    company: string;
    siret: string;
    contact: string;
    city: string;
    services: string;
    expeditionCount: number;
    status: string;
}

export interface NormalizedCrmClient {
    sourceRow: number;
    companyName: string;
    siret: string;
    contactName: string | null;
    email: string | null;
    city: string;
    status: 'Actif' | 'Inactif';
    services: string[];
    expeditionCount: number;
    sourceServices: string;
}

function searchKey(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('fr-FR')
        .replace(/\s+/g, ' ')
        .trim();
}

function titleCase(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase('fr-FR')
        .replace(/(^|[\s/'-])\p{L}/gu, match => match.toLocaleUpperCase('fr-FR'));
}

export function extractContact(value: string): { name: string | null; email: string | null } {
    const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLocaleLowerCase('fr-FR') ?? null;
    const withoutEmail = email
        ? value.replace(new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
        : value;
    const cleanName = withoutEmail.replace(/[.\s]+$/g, '').replace(/\s+/g, ' ').trim();
    return { name: cleanName ? titleCase(cleanName) : null, email };
}

export function mapCrmServices(value: string): string[] {
    const key = searchKey(value);
    const mapped: string[] = [];
    if (key.includes('tournee')) mapped.push('tournees-regulieres');
    if (key.includes('vehicule') || key.includes('tautliner')) mapped.push('vehicules-avec-chauffeurs');
    if (key.includes('frigorifique')) mapped.push('transport-frigorifique');
    if (key.includes('benne')) mapped.push('benne-aluminium-acier');
    if (key.includes('citerne') || key.includes('citene')) mapped.push('citernes-pulverulentes');
    return [...new Set(mapped)];
}

export function normalizeCrmRow(row: CrmSourceRow): NormalizedCrmClient {
    const contact = extractContact(row.contact);
    const status = searchKey(row.status) === 'inactif' ? 'Inactif' : 'Actif';
    return {
        sourceRow: row.rowNumber,
        companyName: row.company.trim(),
        siret: row.siret.replace(/\s+/g, ' ').trim(),
        contactName: contact.name,
        email: contact.email,
        city: row.city.split('/').map(titleCase).join(' / '),
        status,
        services: mapCrmServices(row.services),
        expeditionCount: Math.max(0, Math.trunc(row.expeditionCount || 0)),
        sourceServices: row.services.trim(),
    };
}

export function crmClientIdentity(client: Pick<NormalizedCrmClient, 'companyName' | 'siret' | 'city'>): string {
    return [client.companyName, client.siret, client.city].map(searchKey).join('|');
}

export const DEMO_CLIENT_NAMES = [
    'Transports Bernard',
    'Groupe Mercier',
    'Fruidis SAS',
    'BTP Girard',
    'Agri Loire',
    'Décor Simon',
] as const;
