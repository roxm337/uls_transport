import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { privateClaimDocumentResponse } from '@/lib/server/claim-documents';
import { requireSection } from '@/lib/server/staff-auth';

export const runtime = 'nodejs';
const SECTION = '/admin/reclamations';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;
    const { id, documentId } = await params;
    const document = await prisma.clientClaimDocument.findFirst({
        where: { id: documentId, claimId: id },
        select: { storedName: true, originalName: true, mimeType: true },
    });
    if (!document) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    return privateClaimDocumentResponse(document);
}
