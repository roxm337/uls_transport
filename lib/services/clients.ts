export interface ClientContact {
    id: string;
    clientId: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
}

export interface Client {
    id: string;
    companyName: string;
    siret: string | null;
    vatNumber: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    addressLine: string | null;
    postalCode: string | null;
    city: string | null;
    country: string;
    status: string;
    services: string | null;
    accountManagerId: string | null;
    paymentTerms: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: { expeditions: number; contacts: number };
    contacts?: ClientContact[];
    expeditions?: Expedition[];
}

export interface Expedition {
    id: string;
    reference: string;
    clientId: string;
    service: string;
    status: string;
    pickupAddress: string | null;
    pickupPostalCode: string | null;
    pickupCity: string | null;
    pickupDate: string | null;
    deliveryAddress: string | null;
    deliveryPostalCode: string | null;
    deliveryCity: string | null;
    deliveryDate: string | null;
    goodsDescription: string | null;
    packages: number | null;
    weightKg: number | null;
    temperature: string | null;
    vehicleType: string | null;
    priceHt: number | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    client?: { id: string; companyName: string };
    events?: ExpeditionEvent[];
}

/** One entry of an expedition's append-only history. */
export interface ExpeditionEvent {
    id: string;
    expeditionId: string;
    type: string;
    status: string | null;
    previousStatus: string | null;
    note: string | null;
    userId: string | null;
    userName: string | null;
    createdAt: string;
}

/** A page of results plus the totals of the whole filtered set. */
export interface Page<T, Totals> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
    totals: Totals;
}

/**
 * Write payload. `services` is an array here but is persisted as a JSON
 * string, so it has to override the Client field rather than extend it.
 */
export type ClientInput = Omit<Partial<Client>, 'services'> & { services?: string[] };

async function json<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Requête échouée');
    }
    return res.json();
}

// ── Clients ───────────────────────────────────────────────────────────

export type ClientTotals = { all: number; actifs: number; expeditions: number };

export async function fetchClients(params: {
    search?: string;
    status?: string;
    service?: string;
    page?: number;
    pageSize?: number;
} = {}): Promise<Page<Client, ClientTotals>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status && params.status !== 'All') qs.set('status', params.status);
    if (params.service && params.service !== 'All') qs.set('service', params.service);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));

    const res = await fetch(`/api/admin/clients?${qs.toString()}`, { cache: 'no-store' });
    const data = await json<{
        clients: Client[];
        page: number;
        pageSize: number;
        total: number;
        pageCount: number;
        totals: ClientTotals;
    }>(res);

    return {
        items: data.clients,
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        pageCount: data.pageCount,
        totals: data.totals,
    };
}

/** Minimal shape for pickers: id + name, nothing else. */
export interface ClientOption {
    id: string;
    companyName: string;
}

/**
 * Every client, for a `<Select>`. Deliberately separate from `fetchClients`:
 * that one is paged, and a picker fed a single page would silently hide every
 * client past the first 25.
 */
export async function fetchClientOptions(): Promise<ClientOption[]> {
    const res = await fetch('/api/admin/clients/options', { cache: 'no-store' });
    const data = await json<{ clients: ClientOption[] }>(res);
    return data.clients;
}

export async function fetchClient(id: string): Promise<Client> {
    const res = await fetch(`/api/admin/clients/${id}`, { cache: 'no-store' });
    const data = await json<{ client: Client }>(res);
    return data.client;
}

export async function createClient(payload: ClientInput) {
    const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return json<{ client: Client }>(res);
}

export async function updateClient(id: string, payload: ClientInput) {
    const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return json<{ client: Client }>(res);
}

export async function deleteClient(id: string) {
    const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
    return json<{ success: boolean; expeditionsRemoved: number }>(res);
}

// ── Contacts ──────────────────────────────────────────────────────────

export async function createContact(clientId: string, payload: Partial<ClientContact>) {
    const res = await fetch(`/api/admin/clients/${clientId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return json<{ contact: ClientContact }>(res);
}

export async function deleteContact(id: string) {
    const res = await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' });
    return json<{ success: boolean }>(res);
}

// ── Expeditions ───────────────────────────────────────────────────────

export type ExpeditionTotals = { all: number; active: number; delivered: number };

export async function fetchExpeditions(params: {
    search?: string;
    status?: string;
    service?: string;
    clientId?: string;
    page?: number;
    pageSize?: number;
} = {}): Promise<Page<Expedition, ExpeditionTotals>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status && params.status !== 'All') qs.set('status', params.status);
    if (params.service && params.service !== 'All') qs.set('service', params.service);
    if (params.clientId) qs.set('clientId', params.clientId);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));

    const res = await fetch(`/api/admin/expeditions?${qs.toString()}`, { cache: 'no-store' });
    const data = await json<{
        expeditions: Expedition[];
        page: number;
        pageSize: number;
        total: number;
        pageCount: number;
        totals: ExpeditionTotals;
    }>(res);

    return {
        items: data.expeditions,
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        pageCount: data.pageCount,
        totals: data.totals,
    };
}

export async function fetchExpedition(id: string): Promise<Expedition> {
    const res = await fetch(`/api/admin/expeditions/${id}`, { cache: 'no-store' });
    const data = await json<{ expedition: Expedition }>(res);
    return data.expedition;
}

export async function createExpedition(payload: Partial<Expedition>) {
    const res = await fetch('/api/admin/expeditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return json<{ expedition: Expedition }>(res);
}

export async function updateExpedition(id: string, payload: Partial<Expedition>) {
    const res = await fetch(`/api/admin/expeditions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return json<{ expedition: Expedition }>(res);
}

export async function deleteExpedition(id: string) {
    const res = await fetch(`/api/admin/expeditions/${id}`, { method: 'DELETE' });
    return json<{ success: boolean }>(res);
}
