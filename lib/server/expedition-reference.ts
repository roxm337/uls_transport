import type { Prisma } from '@prisma/client';

/**
 * Allocate the next expedition reference for the current year:
 * ULS-2026-0001, ULS-2026-0002, …
 *
 * Runs inside the caller's transaction and reads the highest existing
 * reference for the year, so a deleted record never causes a collision the
 * way a plain COUNT(*) would.
 */
export async function nextExpeditionReference(
    tx: Prisma.TransactionClient,
    year: number
): Promise<string> {
    const prefix = `ULS-${year}-`;

    const last = await tx.expedition.findFirst({
        where: { reference: { startsWith: prefix } },
        orderBy: { reference: 'desc' },
        select: { reference: true },
    });

    let next = 1;
    if (last) {
        const parsed = parseInt(last.reference.slice(prefix.length), 10);
        if (Number.isFinite(parsed)) next = parsed + 1;
    }

    return `${prefix}${String(next).padStart(4, '0')}`;
}
