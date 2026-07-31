/**
 * Request origin validation.
 *
 * Split out of `lib/csrf.ts` so the middleware can import it: that module
 * pulls in the security logger, which pulls in Prisma, which cannot run in
 * the edge runtime the middleware executes in. Everything here is pure
 * header inspection, with no I/O.
 */

/** Methods that change state and therefore need an origin check. */
export const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

/**
 * Origins accepted in addition to the request's own host.
 *
 * `PRODUCTION_URL` is always honoured. It used to be consulted only when
 * `ALLOWED_ORIGINS` was unset, so setting the latter silently disabled the
 * former — the README documents both as CSRF origins, and a deployment
 * naming its own domain in `PRODUCTION_URL` while listing anything at all
 * in `ALLOWED_ORIGINS` was left relying on the Host header alone. Adding
 * the app's own canonical origin loosens nothing.
 *
 * `ALLOWED_ORIGINS`, when set, still replaces the localhost defaults: that
 * list is how a deployment says "these and no others".
 */
function getAllowedOrigins(): string[] {
    const origins: string[] = [];

    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
        origins.push(...envOrigins.split(',').map(origin => origin.trim()).filter(Boolean));
    } else {
        origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
    }

    if (process.env.PRODUCTION_URL) {
        // Remove trailing slash if present
        const prodUrl = process.env.PRODUCTION_URL.replace(/\/$/, '');
        origins.push(prodUrl);
        // Also allow with trailing slash just in case
        origins.push(prodUrl + '/');
    }

    return origins;
}

/**
 * Validate a request's origin against the allow-list and its own host.
 *
 * @param request - any Request (Next's NextRequest included)
 * @returns true when the origin is acceptable
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
        } catch {
            /* ignore invalid URLs */
        }
    });

    const allAllowed = Array.from(new Set([...allowedOrigins, ...domainsWithWww]));

    // 4. No origin and no referer: only safe methods may pass. Browsers always
    //    attach Origin to a cross-site state-changing request, so a request
    //    without one is either same-origin or not from a browser at all.
    if (!origin && !referer) {
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

/** True when this request changes state and so must pass the origin check. */
export function isMutating(request: Request): boolean {
    return MUTATING_METHODS.includes(request.method);
}
