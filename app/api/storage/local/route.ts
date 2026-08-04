import { NextResponse } from 'next/server';
import { MAX_CLAIM_DOCUMENT_SIZE } from '@/lib/server/claim-documents';
import { storageDriver, verifyLocalUpload, writeObject } from '@/lib/server/object-storage';

export const runtime = 'nodejs';

/**
 * The local-disk stand-in for an R2 presigned PUT.
 *
 * It exists so the upload flow is identical in development and production —
 * ask for a grant, PUT the file at the URL you are given, then finalize — with
 * no Cloudflare account needed to run `pnpm dev`. Once R2 is configured this
 * route refuses everything, because uploads then go straight to R2.
 *
 * Authorisation is the signature in the query string, exactly as it is for a
 * presigned URL: it names one key and one content type, and it expires. There
 * is deliberately no session check — a grant is the credential.
 */
export async function PUT(req: Request) {
    if (storageDriver() !== 'local') {
        return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') ?? '';
    const contentType = searchParams.get('contentType') ?? '';
    const expiresAt = Number(searchParams.get('expiresAt'));
    const signature = searchParams.get('signature') ?? '';

    if (!verifyLocalUpload(key, contentType, expiresAt, signature)) {
        return NextResponse.json({ error: 'Lien de dépôt expiré ou invalide.' }, { status: 403 });
    }

    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength <= 0 || bytes.byteLength > MAX_CLAIM_DOCUMENT_SIZE) {
        return NextResponse.json({ error: 'Taille de fichier invalide.' }, { status: 413 });
    }

    try {
        await writeObject(key, bytes, contentType);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Local object write failed:', error);
        return NextResponse.json({ error: 'Écriture impossible.' }, { status: 500 });
    }
}
