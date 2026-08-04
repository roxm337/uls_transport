import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getClientSession } from '@/lib/server/client-auth';
import {
    claimDocumentDirectory,
    MAX_CLAIM_DOCUMENTS,
    validateClaimDocument,
} from '@/lib/server/claim-documents';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const attempt = rateLimit(`client-claim-document:${session.clientId}`, 30, 60 * 60 * 1000);
    if (!attempt.success) return NextResponse.json({ error: 'Trop de documents envoyés. Réessayez plus tard.' }, { status: 429 });

    const { id } = await params;
    const claim = await prisma.clientClaim.findFirst({
        where: { id, clientId: session.clientId },
        select: { id: true, _count: { select: { documents: true } } },
    });
    if (!claim) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    if (claim._count.documents >= MAX_CLAIM_DOCUMENTS) {
        return NextResponse.json({ error: `Maximum ${MAX_CLAIM_DOCUMENTS} documents par dossier.` }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Aucun document reçu.' }, { status: 400 });

    const validated = await validateClaimDocument(file);
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

    const storedName = `${randomUUID()}.${validated.extension}`;
    const directory = claimDocumentDirectory();
    const path = join(directory, storedName);
    await mkdir(directory, { recursive: true });
    await writeFile(path, validated.bytes, { flag: 'wx' });

    try {
        const document = await prisma.clientClaimDocument.create({
            data: {
                claimId: claim.id,
                originalName: validated.originalName,
                storedName,
                mimeType: validated.mimeType,
                size: validated.bytes.byteLength,
            },
            select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
        });
        return NextResponse.json({ document }, { status: 201 });
    } catch (error) {
        await unlink(path).catch(() => undefined);
        console.error('Failed to save claim document:', error);
        return NextResponse.json({ error: 'Enregistrement du document impossible.' }, { status: 500 });
    }
}
