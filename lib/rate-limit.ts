/**
 * Rate Limiting Utility
 * 
 * Provides in-memory rate limiting for authentication endpoints to prevent brute-force attacks.
 * For production with multiple servers, consider using Redis for distributed rate limiting.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Check and enforce rate limit for a given identifier
 * 
 * @param identifier - Unique identifier (e.g., "login:192.168.1.1")
 * @param limit - Maximum number of attempts allowed (default: 5)
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns Rate limit result with success status and metadata
 */
export function rateLimit(
    identifier: string,
    limit: number = 5,
    windowMs: number = 15 * 60 * 1000
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    // No previous attempts or window expired
    if (!entry || entry.resetAt < now) {
        const resetAt = now + windowMs;
        rateLimitStore.set(identifier, {
            count: 1,
            resetAt
        });

        return {
            success: true,
            limit,
            remaining: limit - 1,
            reset: resetAt
        };
    }

    // Within the rate limit window
    if (entry.count < limit) {
        entry.count++;

        return {
            success: true,
            limit,
            remaining: limit - entry.count,
            reset: entry.resetAt
        };
    }

    // Limit exceeded
    return {
        success: false,
        limit,
        remaining: 0,
        reset: entry.resetAt
    };
}

/**
 * Reset rate limit for a specific identifier
 * Useful for clearing limits after successful authentication
 * 
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
    rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status without incrementing count
 * 
 * @param identifier - Unique identifier to check
 * @param limit - Maximum number of attempts allowed
 * @returns Current rate limit status
 */
export function getRateLimitStatus(
    identifier: string,
    limit: number = 5
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || entry.resetAt < now) {
        return {
            success: true,
            limit,
            remaining: limit,
            reset: now
        };
    }

    return {
        success: entry.count < limit,
        limit,
        remaining: Math.max(0, limit - entry.count),
        reset: entry.resetAt
    };
}
