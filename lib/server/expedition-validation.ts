export class ExpeditionValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExpeditionValidationError';
    }
}

export function parseExpeditionDate(value: unknown, label: string): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string') {
        throw new ExpeditionValidationError(`${label} invalide.`);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new ExpeditionValidationError(`${label} invalide.`);
    }
    return parsed;
}

export function parseNonNegativeNumber(
    value: unknown,
    label: string,
    options: { integer?: boolean } = {}
): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || (options.integer && !Number.isInteger(parsed))) {
        const qualifier = options.integer ? 'un entier positif ou nul' : 'un nombre positif ou nul';
        throw new ExpeditionValidationError(`${label} doit être ${qualifier}.`);
    }
    return parsed;
}

export function validateExpeditionDates(
    pickupDate: Date | null,
    deliveryDate: Date | null
): void {
    if (pickupDate && deliveryDate && deliveryDate.getTime() < pickupDate.getTime()) {
        throw new ExpeditionValidationError(
            "La date de livraison ne peut pas précéder la date d'enlèvement."
        );
    }
}
