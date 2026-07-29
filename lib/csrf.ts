/**
 * CSRF Protection Utility
 * 
 * Provides origin validation for CSRF protection.
 * Works in conjunction with SameSite=strict cookies for defense-in-depth.
 */

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
    const envOrigins = process.env.ALLOWED_ORIGINS;

    if (envOrigins) {
        return envOrigins.split(',').map(origin => origin.trim());
    }

    // Default allowed origins for development and production
    const defaults = ['http://localhost:3000', 'http://127.0.0.1:3000'];

    // Add production domain if NODE_ENV is production
    if (process.env.PRODUCTION_URL) {
        // Remove trailing slash if present
        const prodUrl = process.env.PRODUCTION_URL.replace(/\/$/, '');
        defaults.push(prodUrl);
        // Also allow with trailing slash just in case
        defaults.push(prodUrl + '/');
    }

    return defaults;
}

/**
 * Validate request origin against allowed origins
 * 
 * @param request - Next.js Request object
 * @returns true if origin is valid, false otherwise
 */
export function validateOrigin(request: Request): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

    // 1. Get explicitly allowed origins
    const allowedOrigins = getAllowedOrigins();

    // 2. Add current host and forwarded host to allowed origins
    if (host) {
        allowedOrigins.push(`http://${host}`);
        allowedOrigins.push(`https://${host}`);
    }
    if (forwardedHost) {
        allowedOrigins.push(`${forwardedProto}://${forwardedHost}`);
    }

    // 3. Handle 'www' variants for all allowed origins
    const domainsWithWww: string[] = [];
    allowedOrigins.forEach(url => {
        try {
            const parsed = new URL(url);
            if (!parsed.hostname.startsWith('www.')) {
                domainsWithWww.push(`${parsed.protocol}//www.${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`);
            } else {
                domainsWithWww.push(`${parsed.protocol}//${parsed.hostname.replace(/^www\./, '')}${parsed.port ? ':' + parsed.port : ''}`);
            }
        } catch (e) { /* ignore invalid URLs */ }
    });

    const allAllowed = Array.from(new Set([...allowedOrigins, ...domainsWithWww]));

    // 4. Same-origin check (no origin/referer)
    if (!origin && !referer) {
        // Direct API calls or same-origin non-browser requests
        // Since we have SameSite=strict cookies, we can allow this for GET/HEAD
        const method = request.method;
        return method === 'GET' || method === 'HEAD';
    }

    // 5. Check origin header
    if (origin) {
        return allAllowed.some(allowed =>
            origin === allowed ||
            origin === allowed.replace(/\/$/, '') ||
            allowed === origin.replace(/\/$/, '')
        );
    }

    // 6. Fallback to referer check
    if (referer) {
        return allAllowed.some(allowed => referer.startsWith(allowed));
    }

    return false;
}

import { logSecurityEvent, SecurityEvent, SecuritySeverity } from '@/lib/security-logger';

/**
 * Middleware helper to validate CSRF for state-changing operations
 * Use this for POST, PATCH, PUT, DELETE requests
 * 
 * @param request - Next.js Request object  
 * @returns Response with error if validation fails, null otherwise
 */
export async function validateCsrf(request: Request): Promise<Response | null> {
    const method = request.method;

    // Only validate state-changing methods
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        return null;
    }

    // Validate origin
    if (!validateOrigin(request)) {
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');

        await logSecurityEvent(SecurityEvent.CSRF_VIOLATION, {
            severity: SecuritySeverity.ERROR,
            details: { origin, referer, method },
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
