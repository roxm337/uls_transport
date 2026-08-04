import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';
import { requireSection } from '@/lib/server/staff-auth';
import { isClaimStatus } from '@/lib/claims';

const SECTION = '/admin/reclamations';

function present<T extends { requestedAmount: unknown }>(claim: T) {
    return {
        ...claim,
        requestedAmount: claim.requestedAmount === null ? null : Number(claim.requestedAmount),
    };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const claim = await prisma.clientClaim.findUnique({
        where: { id },
        include: {
            client: { select: { id: true, companyName: true, email: true, phone: true } },
            expedition: { select: { id: true, reference: true } },
            documents: { select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true } },
        },
    });
    if (!claim) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    return NextResponse.json({ claim: present(claim) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;
        const body = await req.json();
        const previous = await prisma.clientClaim.findUnique({ where: { id } });
        if (!previous) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });

        const status = body.status === undefined ? previous.status : body.status;
        if (!isClaimStatus(status)) {
            return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
        }

        const publicResponse = typeof body.publicResponse === 'string'
            ? body.publicResponse.trim().slice(0, 5000) || null
            : previous.publicResponse;
        const internalNote = typeof body.internalNote === 'string'
            ? body.internalNote.trim().slice(0, 10000) || null
            : previous.internalNote;
        const claim = await prisma.clientClaim.update({
            where: { id },
            data: {
                status,
                publicResponse,
                internalNote,
                resolvedAt: status === 'RESOLUE' ? previous.resolvedAt ?? new Date() : null,
            },
            include: {
                client: { select: { id: true, companyName: true } },
                expedition: { select: { id: true, reference: true } },
                documents: { select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true } },
            },
        });

        await logAction('Update Client Claim', {
            id: claim.id,
            reference: claim.reference,
            status: claim.status,
            clientId: claim.clientId,
        });
        return NextResponse.json({ claim: present(claim) });
    } catch (error) {
        console.error('Failed to update client claim:', error);
        return NextResponse.json({ error: 'Mise à jour du dossier impossible.' }, { status: 500 });
    }
}
