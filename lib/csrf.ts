/**
 * CSRF Protection Utility
 *
 * Origin validation for state-changing requests, working alongside the
 * SameSite=strict session cookie as defence in depth.
 *
 * The check itself now lives in `lib/origin.ts`, which the middleware also
 * imports — this module adds the database-backed security logging that the
 * edge runtime cannot do.
 */

import { logSecurityEvent, SecurityEvent, SecuritySeverity } from '@/lib/security-logger';
import { validateOrigin, isMutating } from '@/lib/origin';

export { validateOrigin } from '@/lib/origin';

/**
 * Reject a state-changing request whose origin is not trusted.
 *
 * The middleware performs the same check first, so reaching this function
 * with a bad origin means the request bypassed it (a route outside the
 * matcher, or a direct server-side call). It stays in place as a second
 * line of defence and as the place where the violation is recorded.
 *
 * @param request - Next.js Request object
 * @returns a 403 Response when validation fails, null otherwise
 */
export async function validateCsrf(request: Request): Promise<Response | null> {
    // Only validate state-changing methods
    if (!isMutating(request)) {
        return null;
    }

    if (!validateOrigin(request)) {
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');

        await logSecurityEvent(SecurityEvent.CSRF_VIOLATION, {
            severity: SecuritySeverity.ERROR,
            details: { origin, referer, method: request.method },
            req: request
        });

        return new Response(
            JSON.stringify({
                error: 'Invalid request origin. CSRF validation failed.'
            }),
            {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    return null;
}
