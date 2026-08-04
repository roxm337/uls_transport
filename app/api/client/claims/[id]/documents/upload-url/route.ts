import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getClientSession } from '@/lib/server/client-auth';
import { MAX_CLAIM_DOCUMENTS, newClaimObjectKey, validateClaimUpload } from '@/lib/server/claim-documents';
import { createUploadGrant } from '@/lib/server/object-storage';

export const runtime = 'nodejs';

/**
 * Issue a short-lived grant to upload one document straight to object storage.
 *
 * The file never passes through this function — Vercel caps a request body at
 * 4.5 MB, well under the 8 MB a claimant is allowed. Nothing is recorded here;
 * the row is written by the finalize call once the bytes can be inspected.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const attempt = await rateLimit(`client-claim-document:${session.clientId}`, 30, 60 * 60 * 1000);
    if (!attempt.success) {
        return NextResponse.json({ error: 'Trop de documents envoyés. Réessayez plus tard.' }, { status: 429 });
    }

    const { id } = await params;
    const claim = await prisma.clientClaim.findFirst({
        where: { id, clientId: session.clientId },
        select: { id: true, _count: { select: { documents: true } } },
    });
    if (!claim) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    if (claim._count.documents >= MAX_CLAIM_DOCUMENTS) {
        return NextResponse.json({ error: `Maximum ${MAX_CLAIM_DOCUMENTS} documents par dossier.` }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }
    const { contentType, size } = (body ?? {}) as { contentType?: unknown; size?: unknown };

    const validated = validateClaimUpload(contentType, size);
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

    // The key is built here, never taken from the caller, and carries the claim
    // id so finalize can check the object belongs to the claim it names.
    const key = newClaimObjectKey(claim.id, validated.mimeType);

    try {
        const grant = await createUploadGrant(key, validated.mimeType);
        return NextResponse.json(grant);
    } catch (error) {
        console.error('Failed to create claim upload grant:', error);
        return NextResponse.json({ error: 'Envoi de document momentanément indisponible.' }, { status: 500 });
    }
}
