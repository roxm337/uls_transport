import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getClientSession } from '@/lib/server/client-auth';
import { rateLimit } from '@/lib/rate-limit';
import { isClaimIssueType, isClaimType } from '@/lib/claims';

const MAX_DESCRIPTION = 5000;

function present<T extends { requestedAmount: unknown; internalNote?: unknown }>(claim: T) {
    const safe = { ...claim };
    delete safe.internalNote;
    return {
        ...safe,
        requestedAmount: claim.requestedAmount === null ? null : Number(claim.requestedAmount),
    };
}

function parseAmount(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const amount = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
    return Math.round(amount * 100) / 100;
}

export async function GET() {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const claims = await prisma.clientClaim.findMany({
        where: { clientId: session.clientId },
        orderBy: { createdAt: 'desc' },
        include: {
            expedition: { select: { id: true, reference: true } },
            documents: { select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true } },
        },
        take: 100,
    });
    return NextResponse.json({ claims: claims.map(present) });
}

export async function POST(req: Request) {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const attempt = await rateLimit(`client-claim:${session.clientId}`, 10, 60 * 60 * 1000);
    if (!attempt.success) {
        return NextResponse.json(
            { error: 'Trop de demandes ont été créées. Réessayez plus tard.' },
            { status: 429 },
        );
    }

    try {
        const body = await req.json();
        const type = body.type;
        const issueType = body.issueType;
        const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
        const description = typeof body.description === 'string' ? body.description.trim() : '';
        const expeditionId = typeof body.expeditionId === 'string' && body.expeditionId
            ? body.expeditionId
            : null;
        const requestedAmount = parseAmount(body.requestedAmount);

        if (!isClaimType(type)) {
            return NextResponse.json({ error: 'Type de demande invalide.' }, { status: 400 });
        }
        if (!isClaimIssueType(issueType)) {
            return NextResponse.json({ error: 'Type de litige invalide.' }, { status: 400 });
        }
        if (subject.length < 5 || subject.length > 160) {
            return NextResponse.json({ error: 'L’objet doit contenir entre 5 et 160 caractères.' }, { status: 400 });
        }
        if (description.length < 20 || description.length > MAX_DESCRIPTION) {
            return NextResponse.json({ error: 'Décrivez la situation en 20 à 5 000 caractères.' }, { status: 400 });
        }
        if (type === 'REMBOURSEMENT' && requestedAmount === null) {
            return NextResponse.json({ error: 'Indiquez un montant de remboursement valide.' }, { status: 400 });
        }

        if (expeditionId) {
            const expedition = await prisma.expedition.findFirst({
                where: { id: expeditionId, clientId: session.clientId },
                select: { id: true },
            });
            if (!expedition) {
                return NextResponse.json({ error: 'Expédition introuvable.' }, { status: 404 });
            }
        }

        let claim = null;
        for (let index = 0; index < 3 && !claim; index += 1) {
            const reference = `DOS-${new Date().getFullYear()}-${randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`;
            try {
                claim = await prisma.clientClaim.create({
                    data: {
                        reference,
                        clientId: session.clientId,
                        expeditionId,
                        type,
                        issueType,
                        subject,
                        description,
                        requestedAmount: type === 'REMBOURSEMENT' ? requestedAmount : null,
                    },
                    include: {
                        expedition: { select: { id: true, reference: true } },
                        documents: { select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true } },
                    },
                });
            } catch (error) {
                const collision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
                if (!collision || index === 2) throw error;
            }
        }

        if (!claim) throw new Error('Claim reference allocation failed');
        return NextResponse.json({ claim: present(claim) }, { status: 201 });
    } catch (error) {
        console.error('Failed to create client claim:', error);
        return NextResponse.json({ error: 'Création de la demande impossible.' }, { status: 500 });
    }
}
