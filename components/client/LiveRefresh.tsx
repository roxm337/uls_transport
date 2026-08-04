'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keeps a server-rendered portal page current.
 *
 * The client portal is rendered on the server, so a page reflects the database
 * as it was when it was requested and nothing after. A claimant watching their
 * dossier would not see ULS move it to « En cours », or a reply appear, until
 * they navigated away and back. This asks Next to re-render the current route —
 * fresh data, same scroll position, no visible reload.
 *
 * It runs when the tab regains focus (the common case: leave the page open,
 * come back later) and on a slow timer while it is being watched. Hidden tabs
 * are skipped, so a portal left open in the background costs nothing.
 */
export function LiveRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
    const router = useRouter();

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible') router.refresh();
        };

        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        const timer = setInterval(refresh, intervalMs);

        return () => {
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
            clearInterval(timer);
        };
    }, [router, intervalMs]);

    return null;
}
