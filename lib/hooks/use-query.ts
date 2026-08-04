'use client';

import * as React from 'react';

export interface Query<T> {
    /** Last result that arrived. Kept across reloads so the table never blanks. */
    data: T | null;
    /** True until the result for the *current* key has arrived. */
    loading: boolean;
    error: Error | null;
    /**
     * Refetch the current key — for use after a create, edit, or delete.
     * `{ silent: true }` refetches without raising `loading`, so a background
     * poll does not flash a spinner over a table the user is reading.
     */
    reload: (options?: { silent?: boolean }) => void;
}

export interface QueryOptions<T> {
    /**
     * Skip fetching while false — for data a closed dialog or an inapplicable
     * role has no use for. `loading` stays false, so a skipped query never
     * presents itself as one still in flight.
     */
    enabled?: boolean;
    /**
     * Silently refetch on this interval so a colleague's edit appears without
     * anyone reaching for reload. Refetching is skipped while the tab is
     * hidden — a background tab nobody is reading does not need fresh data.
     */
    refreshMs?: number;
    onSuccess?: (data: T, meta: { silent: boolean }) => void;
    /**
     * `meta.silent` marks a background poll. A failed one should usually stay
     * quiet — the table on screen is still valid, and a toast every 30s is noise.
     */
    onError?: (error: Error, meta: { silent: boolean }) => void;
}

/**
 * Fetch whenever `key` changes, and expose the result.
 *
 * Two things the hand-rolled `useCallback` + `useEffect(() => void load())`
 * pattern this replaces got wrong:
 *
 * 1. It raced. Every filter change started a fetch and whichever reply landed
 *    last won, so typing quickly in a search box could leave the table showing
 *    results for a query the user had already moved past. Replies for a key
 *    that is no longer current are now dropped.
 *
 * 2. It set the loading flag synchronously inside the effect, which cascades an
 *    extra render on every fetch (`react-hooks/set-state-in-effect`). Loading is
 *    derived here instead — we hold the key the data belongs to, and anything
 *    that isn't the current key means a fetch is still in flight. No state is
 *    set in the effect body at all.
 *
 * `key` must identify the request: build it from the parameters the fetcher
 * closes over, e.g. `JSON.stringify({ search, status, page })`.
 */
export function useQuery<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: QueryOptions<T> = {},
): Query<T> {
    // The counter rides along in the key so an explicit reload refetches exactly
    // like a filter change does. `silentFor` records which key a silent reload
    // was asked for: once `key` changes that is a real navigation and the
    // spinner must come back, hence a key comparison rather than a bare flag.
    const [refresh, setRefresh] = React.useState<{ count: number; silentFor: string | null }>({
        count: 0,
        silentFor: null,
    });
    const currentKey = refresh.count + ' ' + key;
    const silent = refresh.silentFor === key;
    const enabled = options.enabled ?? true;

    const [settled, setSettled] = React.useState<{
        key: string | null;
        data: T | null;
        error: Error | null;
    }>({ key: null, data: null, error: null });

    // `fetcher` and `options` are new closures on every render; keeping them in
    // a ref lets `key` alone decide when to refetch, which is the point of `key`.
    const latest = React.useRef({ fetcher, options });
    React.useEffect(() => {
        latest.current = { fetcher, options };
    });

    React.useEffect(() => {
        if (!enabled) return;
        let active = true;
        const meta = { silent };
        latest.current
            .fetcher()
            .then(data => {
                if (!active) return;
                setSettled({ key: currentKey, data, error: null });
                latest.current.options.onSuccess?.(data, meta);
            })
            .catch((cause: unknown) => {
                if (!active) return;
                const error = cause instanceof Error ? cause : new Error(String(cause));
                // Keep the previous rows on screen: a failed refresh should not
                // empty a table the user is reading.
                setSettled(previous => ({ key: currentKey, data: previous.data, error }));
                latest.current.options.onError?.(error, meta);
            });
        return () => {
            active = false;
        };
        // `silent` is derived from the same state as `currentKey`; re-running on
        // it would double-fetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentKey, enabled]);

    const reload = React.useCallback((reloadOptions?: { silent?: boolean }) => {
        setRefresh(previous => ({
            count: previous.count + 1,
            silentFor: reloadOptions?.silent ? key : null,
        }));
    }, [key]);

    // Bring the view up to date without anyone asking for it: when the tab is
    // brought back to the front, and optionally on a timer. Both go through the
    // silent path, so the table never flashes a spinner at someone who is
    // reading it — the rows just become current.
    const refreshMs = options.refreshMs ?? 0;
    React.useEffect(() => {
        if (!enabled) return;

        const revalidate = () => {
            // A hidden tab is nobody's screen; refetching it only burns quota.
            if (document.visibilityState === 'visible') reload({ silent: true });
        };

        window.addEventListener('focus', revalidate);
        document.addEventListener('visibilitychange', revalidate);
        const timer = refreshMs > 0 ? setInterval(revalidate, refreshMs) : null;

        return () => {
            window.removeEventListener('focus', revalidate);
            document.removeEventListener('visibilitychange', revalidate);
            if (timer) clearInterval(timer);
        };
    }, [enabled, refreshMs, reload]);

    return {
        data: settled.data,
        loading: enabled && settled.key !== currentKey && !silent,
        error: settled.error,
        reload,
    };
}
