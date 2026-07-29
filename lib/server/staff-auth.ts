import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveSections } from '@/lib/sections';

export type StaffRole = 'ADMIN' | 'MANAGER';

export interface StaffSession {
    userId: string;
    role: StaffRole;
    email?: string;
    /** Sections this account holds, resolved from the database on each request. */
    sections: string[];
}

/**
 * Resolve the signed-in staff member. The CRM is internal-only, so every
 * route is either ADMIN or MANAGER — there is no client-facing role.
 *
 * The role and permissions come from the database, not from the JWT: a token
 * lives for 24h, so a claim baked into it would keep granting access long
 * after an admin revoked it.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const userId = (payload.userId || payload.sub || payload.id) as string | undefined;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, email: true, status: true, allowedSections: true },
    });

    // Deleted, suspended or rejected accounts lose access immediately rather
    // than when their token happens to expire.
    if (!user) return null;
    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') return null;
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return null;

    return {
        userId: user.id,
        role: user.role,
        email: user.email,
        sections: resolveSections(user.role, user.allowedSections),
    };
}

/** True when the session may create, edit or delete records. */
export function canWrite(session: StaffSession | null): session is StaffSession {
    return session !== null;
}

/** Destructive operations (delete) are reserved for ADMIN. */
export function canDelete(session: StaffSession | null): boolean {
    return session?.role === 'ADMIN';
}

// ── Route guards ──────────────────────────────────────────────────────
//
// Permissions used to be enforced only by hiding links in the sidebar, which
// stopped nobody: a MANAGER denied a section could still call its API by hand.
// Every /api/admin route now goes through one of these.

export type Guard =
    | { ok: true; session: StaffSession }
    | { ok: false; response: NextResponse };

function deny(status: number, error: string): { ok: false; response: NextResponse } {
    return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/** Any signed-in staff member. */
export async function requireStaff(): Promise<Guard> {
    const session = await getStaffSession();
    if (!session) return deny(401, 'Authentification requise.');
    return { ok: true, session };
}

/**
 * A staff member holding at least one of `sections`.
 *
 * Pass several when a single endpoint backs several screens — the analytics
 * API feeds both the dashboard and the analytics page, so holding either is
 * enough.
 */
export async function requireSection(
    sections: string | string[]
): Promise<Guard> {
    const guard = await requireStaff();
    if (!guard.ok) return guard;

    const wanted = Array.isArray(sections) ? sections : [sections];
    const granted = wanted.some(s => guard.session.sections.includes(s));

    if (!granted) {
        return deny(403, "Vous n'avez pas accès à cette section.");
    }

    return guard;
}

/** ADMIN only. */
export async function requireAdmin(): Promise<Guard> {
    const guard = await requireStaff();
    if (!guard.ok) return guard;

    if (guard.session.role !== 'ADMIN') {
        return deny(403, 'Réservé aux administrateurs.');
    }

    return guard;
}
