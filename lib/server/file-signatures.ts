/**
 * Magic-byte checks, shared by every upload surface.
 *
 * Uploads go straight from the browser to object storage now, so a declared
 * content type is only ever a claim. These run against bytes read back from
 * storage, which is the last point at which the file can be told to be what it
 * says it is.
 */

/** Enough bytes for the longest signature below (WebP needs 12). */
export const SIGNATURE_PREFIX_BYTES = 16;

const ascii = (bytes: Uint8Array, start: number, end: number) =>
    new TextDecoder().decode(bytes.slice(start, end));

const SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
    'application/pdf': bytes => bytes.length >= 5 && ascii(bytes, 0, 5) === '%PDF-',
    'image/jpeg': bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    'image/png': bytes =>
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
    'image/webp': bytes => ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP',
    'image/gif': bytes => ascii(bytes, 0, 4) === 'GIF8',
};

/**
 * False for a type with no signature on file: an unknown type is never trusted
 * just because nothing was there to contradict it.
 */
export function matchesSignature(bytes: Uint8Array, mimeType: string): boolean {
    const check = SIGNATURES[mimeType];
    return check ? check(bytes) : false;
}
