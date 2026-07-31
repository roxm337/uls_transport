import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { validateOrigin, isMutating } from '@/lib/origin';

/** Sections only an ADMIN may open; MANAGER is bounced back to the dashboard. */
const ADMIN_ONLY = ['/admin/users', '/admin/logs', '/admin/settings'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // ── CSRF ──────────────────────────────────────────────────────────
    //
    // Every state-changing API call passes through here. Enforcing it
    // per-route left it out of 13 of the 16 mutating handlers, which is
    // exactly the gap a single choke point closes for good. Routes keep
    // their own validateCsrf() call as a second line of defence.
    if (pathname.startsWith('/api/') && isMutating(req) && !validateOrigin(req)) {
        return NextResponse.json(
            { error: 'Invalid request origin. CSRF validation failed.' },
            { status: 403 }
        );
    }

    if (!pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // The CRM is internal-only: ADMIN and MANAGER are the sole roles.
    if (payload.role !== 'ADMIN' && payload.role !== 'MANAGER') {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    if (payload.role !== 'ADMIN' && ADMIN_ONLY.some(p => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL('/admin', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/:path*'],
};
