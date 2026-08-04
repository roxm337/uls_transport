import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { NextResponse } from 'next/server';

export const MAX_CLAIM_DOCUMENT_SIZE = 8 * 1024 * 1024;
export const MAX_CLAIM_DOCUMENTS = 5;

const TYPES = {
    'application/pdf': { extension: 'pdf', signature: (bytes: Uint8Array) => bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' },
    'image/jpeg': { extension: 'jpg', signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
    'image/png': { extension: 'png', signature: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
    'image/webp': { extension: 'webp', signature: (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP' },
} as const;

export type ClaimDocumentMimeType = keyof typeof TYPES;

export function claimDocumentDirectory(): string {
    return join(process.cwd(), 'storage', 'claims');
}

export async function validateClaimDocument(file: File): Promise<
    | { ok: true; bytes: Uint8Array; mimeType: ClaimDocumentMimeType; extension: string; originalName: string }
    | { ok: false; error: string }
> {
    if (!file.size || file.size > MAX_CLAIM_DOCUMENT_SIZE) {
        return { ok: false, error: 'Chaque document doit peser moins de 8 Mo.' };
    }
    if (!(file.type in TYPES)) {
        return { ok: false, error: 'Formats acceptés : PDF, JPG, PNG et WebP.' };
    }
    const mimeType = file.type as ClaimDocumentMimeType;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!TYPES[mimeType].signature(bytes)) {
        return { ok: false, error: 'Le contenu du document ne correspond pas à son format.' };
    }
    const cleanedName = file.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180) || `document.${TYPES[mimeType].extension}`;
    return { ok: true, bytes, mimeType, extension: TYPES[mimeType].extension, originalName: cleanedName };
}

export async function privateClaimDocumentResponse(document: {
    storedName: string;
    originalName: string;
    mimeType: string;
}): Promise<NextResponse> {
    if (basename(document.storedName) !== document.storedName) {
        return NextResponse.json({ error: 'Document invalide.' }, { status: 400 });
    }
    try {
        const bytes = await readFile(join(claimDocumentDirectory(), document.storedName));
        const filename = encodeURIComponent(document.originalName);
        // Images preview in place; PDFs download. A PDF rendered inline runs its
        // own JavaScript in this origin, which would put anything a claimant
        // uploads on the same footing as the application's own scripts.
        const disposition = document.mimeType === 'application/pdf' ? 'attachment' : 'inline';
        return new NextResponse(new Uint8Array(bytes), {
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
    } catch {
        return NextResponse.json({ error: 'Fichier introuvable.' }, { status: 404 });
    }
}
