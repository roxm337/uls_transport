import { prisma } from './db';

/**
 * Rate limiting, shared across instances.
 *
 * This used to be an in-memory `Map`, which limits only the process it lives
 * in. On serverless that is close to no limit at all: every instance keeps its
 * own tally, so a "5 attempts per 15 minutes" login rule becomes 5 per instance
 * per 15 minutes, and an attacker gets a fresh allowance each time the platform
 * spins up another one. The counters now live in the database every instance
 * already shares.
 */

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    /** Epoch milliseconds at which the current window ends. */
    reset: number;
}

/** Roughly one call in two hundred also clears out expired rows. */
const SWEEP_PROBABILITY = 0.005;

async function sweepExpired(now: Date): Promise<void> {
    try {
        await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
    } catch {
        // Housekeeping only — never let it affect the caller.
    }
}

/**
 * Count one attempt against `identifier` and say whether it is allowed.
 *
 * The insert and the increment are a single statement so that two simultaneous
 * attempts cannot both read the same count and both write count + 1. Expiry is
 * folded into the same statement: a window that has already ended is restarted
 * at 1 rather than continuing to climb.
 */
export async function rateLimit(
    identifier: string,
    limit: number = 5,
    windowMs: number = 15 * 60 * 1000,
): Promise<RateLimitResult> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);

    try {
        const [, rows] = await prisma.$transaction([
            prisma.$executeRaw`
                INSERT INTO \`RateLimit\` (\`id\`, \`count\`, \`resetAt\`)
                VALUES (${identifier}, 1, ${resetAt})
                ON DUPLICATE KEY UPDATE
                    \`count\` = IF(\`resetAt\` <= ${now}, 1, \`count\` + 1),
                    \`resetAt\` = IF(\`resetAt\` <= ${now}, ${resetAt}, \`resetAt\`)
            `,
            prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
                SELECT \`count\`, \`resetAt\` FROM \`RateLimit\` WHERE \`id\` = ${identifier}
            `,
        ]);

        if (Math.random() < SWEEP_PROBABILITY) void sweepExpired(now);

        const row = rows[0];
        if (!row) {
            // Should not happen — the insert above guarantees a row.
            return { success: true, limit, remaining: limit - 1, reset: resetAt.getTime() };
        }

        const count = Number(row.count);
        const windowEnd = new Date(row.resetAt).getTime();
        return {
            success: count <= limit,
            limit,
            remaining: Math.max(0, limit - count),
            reset: windowEnd,
        };
    } catch (error) {
        // Fail open, deliberately. Every caller is an endpoint that needs the
        // database anyway — a login verifies a password hash, a claim writes a
        // row — so a failure here means the request was going to fail regardless.
        // Failing closed would turn a database blip into a total lockout without
        // buying any protection.
        console.error('Rate limit check failed, allowing request:', error);
        return { success: true, limit, remaining: limit - 1, reset: resetAt.getTime() };
    }
}

/**
 * Clear a limit, for use after a successful authentication so that a legitimate
 * user who mistyped their password a few times starts clean.
 */
export async function resetRateLimit(identifier: string): Promise<void> {
    try {
        await prisma.rateLimit.deleteMany({ where: { id: identifier } });
    } catch (error) {
        console.error('Rate limit reset failed:', error);
    }
}
