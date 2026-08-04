import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getClientSession } from '@/lib/server/client-auth';
import { privateClaimDocumentResponse } from '@/lib/server/claim-documents';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    const { id, documentId } = await params;
    const document = await prisma.clientClaimDocument.findFirst({
        where: { id: documentId, claimId: id, claim: { clientId: session.clientId } },
        select: { storedName: true, originalName: true, mimeType: true },
    });
    if (!document) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    return privateClaimDocumentResponse(document);
}
