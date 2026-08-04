import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isSafeKey, readObject } from './object-storage';
import { matchesSignature, SIGNATURE_PREFIX_BYTES } from './file-signatures';

export { SIGNATURE_PREFIX_BYTES };

export const MAX_CLAIM_DOCUMENT_SIZE = 8 * 1024 * 1024;
export const MAX_CLAIM_DOCUMENTS = 5;

const TYPES = {
    'application/pdf': { extension: 'pdf' },
    'image/jpeg': { extension: 'jpg' },
    'image/png': { extension: 'png' },
    'image/webp': { extension: 'webp' },
} as const;

export type ClaimDocumentMimeType = keyof typeof TYPES;

export function isClaimDocumentMimeType(value: unknown): value is ClaimDocumentMimeType {
    return typeof value === 'string' && value in TYPES;
}

export function claimDocumentExtension(mimeType: ClaimDocumentMimeType): string {
    return TYPES[mimeType].extension;
}

/**
 * Does the file actually start the way its declared type requires?
 *
 * The browser now uploads straight to storage, so this runs against bytes read
 * back afterwards rather than against the request. It is the same check as
 * before, moved to the only place that can still make it.
 */
export function matchesClaimSignature(bytes: Uint8Array, mimeType: ClaimDocumentMimeType): boolean {
    return matchesSignature(bytes, mimeType);
}

export function cleanOriginalName(name: unknown, mimeType: ClaimDocumentMimeType): string {
    const raw = typeof name === 'string' ? name : '';
    return (
        raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180) ||
        `document.${TYPES[mimeType].extension}`
    );
}

/** Validation available before the bytes exist — type and declared size only. */
export function validateClaimUpload(
    contentType: unknown,
    size: unknown,
): { ok: true; mimeType: ClaimDocumentMimeType } | { ok: false; error: string } {
    if (!isClaimDocumentMimeType(contentType)) {
        return { ok: false, error: 'Formats acceptés : PDF, JPG, PNG et WebP.' };
    }
    const bytes = typeof size === 'number' ? size : Number(size);
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_CLAIM_DOCUMENT_SIZE) {
        return { ok: false, error: 'Chaque document doit peser moins de 8 Mo.' };
    }
    return { ok: true, mimeType: contentType };
}

/**
 * Where a claim's documents live. Scoping the key by claim means a finalize call
 * can be checked against the claim it names, so one client cannot attach an
 * object uploaded under someone else's claim.
 */
export function claimObjectPrefix(claimId: string): string {
    return `claims/${claimId}/`;
}

export function newClaimObjectKey(claimId: string, mimeType: ClaimDocumentMimeType): string {
    return `${claimObjectPrefix(claimId)}${randomUUID()}.${TYPES[mimeType].extension}`;
}

/**
 * Documents stored before the move to object storage kept a bare file name and
 * lived in `storage/claims`. Reading those through the same key space keeps them
 * downloadable without a data migration.
 */
export function storageKeyFor(storedName: string): string {
    return storedName.includes('/') ? storedName : `claims/${storedName}`;
}

export async function privateClaimDocumentResponse(document: {
    storedName: string;
    originalName: string;
    mimeType: string;
}): Promise<NextResponse> {
    const key = storageKeyFor(document.storedName);
    // Refused by name rather than left to the storage layer to reject: a stored
    // name that escapes its key space is a broken record, not a missing file.
    if (!isSafeKey(key)) {
        return NextResponse.json({ error: 'Document invalide.' }, { status: 400 });
    }
    const bytes = await readObject(key);
    if (!bytes) {
        return NextResponse.json({ error: 'Fichier introuvable.' }, { status: 404 });
    }
    const filename = encodeURIComponent(document.originalName);
    // Images preview in place; PDFs download. A PDF rendered inline runs its
    // own JavaScript in this origin, which would put anything a claimant
    // uploads on the same footing as the application's own scripts.
    const disposition = document.mimeType === 'application/pdf' ? 'attachment' : 'inline';
    // Copied into a plain ArrayBuffer-backed view: the byte array coming back
    // from storage is not narrow enough to be a BodyInit on its own.
    const body = new Uint8Array(bytes);
    return new NextResponse(body, {
        headers: {
            'Content-Type': document.mimeType,
            'Content-Disposition': `${disposition}; filename*=UTF-8''${filename}`,
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff',
            // Belt and braces: `sandbox` alone drops scripts and plugins and
            // gives the response an opaque origin. Adding source directives
            // here would be self-defeating — an opaque origin never matches
            // 'self', so `img-src 'self'` would block the image previews
            // these links exist to show.
            'Content-Security-Policy': 'sandbox',
        },
    });
}
