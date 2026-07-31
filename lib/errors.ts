/**
 * The message of an unknown thrown value.
 *
 * `catch (error: any)` was the habit across this codebase: it silences the
 * compiler and then reads `.message` off something that may not have one.
 */
export function errorMessage(error: unknown, fallback = 'Internal server error'): string {
    return error instanceof Error && error.message ? error.message : fallback;
}
