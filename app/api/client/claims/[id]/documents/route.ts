import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getClientSession } from '@/lib/server/client-auth';
import {
    claimObjectPrefix,
    cleanOriginalName,
    isClaimDocumentMimeType,
    MAX_CLAIM_DOCUMENT_SIZE,
    MAX_CLAIM_DOCUMENTS,
    matchesClaimSignature,
    SIGNATURE_PREFIX_BYTES,
} from '@/lib/server/claim-documents';
import { deleteObject, headObject, readObjectPrefix } from '@/lib/server/object-storage';

export const runtime = 'nodejs';

/**
 * Record a document whose bytes are already in storage.
 *
 * Because the upload bypassed us, everything the browser asserted is checked
 * here against the stored object itself: that it exists, how big it really is,
 * and whether its leading bytes match the type it claims. Anything that fails
 * is deleted rather than left as an orphan.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const attempt = rateLimit(`client-claim-document:${session.clientId}`, 30, 60 * 60 * 1000);
    if (!attempt.success) {
        return NextResponse.json({ error: 'Trop de documents envoyés. Réessayez plus tard.' }, { status: 429 });
    }

    const { id } = await params;
    const claim = await prisma.clientClaim.findFirst({
        where: { id, clientId: session.clientId },
        select: { id: true, _count: { select: { documents: true } } },
    });
    if (!claim) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }
    const { key, originalName, contentType } = (body ?? {}) as {
        key?: unknown;
        originalName?: unknown;
        contentType?: unknown;
    };

    if (!isClaimDocumentMimeType(contentType)) {
        return NextResponse.json({ error: 'Formats acceptés : PDF, JPG, PNG et WebP.' }, { status: 400 });
    }
    // The decisive check: the key must sit under this claim's prefix, so a
    // caller cannot attach an object uploaded against a different claim — even
    // one of their own, and certainly not another client's.
    if (typeof key !== 'string' || !key.startsWith(claimObjectPrefix(claim.id))) {
        return NextResponse.json({ error: 'Document invalide.' }, { status: 400 });
    }

    // Re-checked here and not only when the grant was issued: nothing stops a
    // client requesting several grants at once and finalizing them together.
    if (claim._count.documents >= MAX_CLAIM_DOCUMENTS) {
        await deleteObject(key);
        return NextResponse.json({ error: `Maximum ${MAX_CLAIM_DOCUMENTS} documents par dossier.` }, { status: 400 });
    }

    const head = await headObject(key);
    if (!head) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });

    if (head.size <= 0 || head.size > MAX_CLAIM_DOCUMENT_SIZE) {
        await deleteObject(key);
        return NextResponse.json({ error: 'Chaque document doit peser moins de 8 Mo.' }, { status: 400 });
    }
    // R2 records the content type the presigned URL was signed for; if it is
    // present it has to agree with what is being claimed now.
    if (head.contentType && head.contentType !== contentType) {
        await deleteObject(key);
        return NextResponse.json({ error: 'Document invalide.' }, { status: 400 });
    }

    const prefix = await readObjectPrefix(key, SIGNATURE_PREFIX_BYTES);
    if (!prefix || !matchesClaimSignature(prefix, contentType)) {
        await deleteObject(key);
        return NextResponse.json({ error: 'Le contenu du document ne correspond pas à son format.' }, { status: 400 });
    }

    try {
        const document = await prisma.clientClaimDocument.create({
            data: {
                claimId: claim.id,
                originalName: cleanOriginalName(originalName, contentType),
                storedName: key,
                mimeType: contentType,
                size: head.size,
            },
            select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
        });
        return NextResponse.json({ document }, { status: 201 });
    } catch (error) {
        await deleteObject(key);
        console.error('Failed to save claim document:', error);
        return NextResponse.json({ error: 'Enregistrement du document impossible.' }, { status: 500 });
    }
}
