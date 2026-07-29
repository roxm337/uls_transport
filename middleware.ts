import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

/** Sections only an ADMIN may open; MANAGER is bounced back to the dashboard. */
const ADMIN_ONLY = ['/admin/users', '/admin/logs', '/admin/settings'];

export async function middleware(req: NextRequest) {
    const token = req.cookies.get('auth-token')?.value;
    const { pathname } = req.nextUrl;

    if (!pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

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
    matcher: ['/admin/:path*'],
};
