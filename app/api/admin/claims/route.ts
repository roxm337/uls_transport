import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireSection } from '@/lib/server/staff-auth';
import { CLAIM_ISSUE_TYPES, isClaimIssueType, isClaimStatus, isClaimType, OPEN_CLAIM_STATUSES } from '@/lib/claims';

const SECTION = '/admin/reclamations';
const MAX_PAGE_SIZE = 100;

function present<T extends { requestedAmount: unknown }>(claim: T) {
    return {
        ...claim,
        requestedAmount: claim.requestedAmount === null ? null : Number(claim.requestedAmount),
    };
}

export async function GET(req: Request) {
    const guard = await requireSection(SECTION);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const rawStatus = searchParams.get('status');
    const rawType = searchParams.get('type');
    const rawIssueType = searchParams.get('issueType');
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(Math.max(1, Number(searchParams.get('pageSize')) || 25), MAX_PAGE_SIZE);
    const and: Prisma.ClientClaimWhereInput[] = [];

    if (search) {
        and.push({
            OR: [
                { reference: { contains: search } },
                { subject: { contains: search } },
                { client: { companyName: { contains: search } } },
                { expedition: { reference: { contains: search } } },
            ],
        });
    }
    if (rawStatus && rawStatus !== 'All' && isClaimStatus(rawStatus)) and.push({ status: rawStatus });
    if (rawType && rawType !== 'All' && isClaimType(rawType)) and.push({ type: rawType });
    if (rawIssueType && rawIssueType !== 'All' && isClaimIssueType(rawIssueType)) and.push({ issueType: rawIssueType });

    const where = and.length ? { AND: and } : {};
    const [claims, total, open, refunds, totalClaims, resolvedClaims, declaredVolume, detailedVolume, issueGroups] = await Promise.all([
        prisma.clientClaim.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                client: { select: { id: true, companyName: true } },
                expedition: { select: { id: true, reference: true } },
                documents: { select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true } },
                _count: { select: { documents: true } },
            },
        }),
        prisma.clientClaim.count({ where }),
        prisma.clientClaim.count({ where: { AND: [...and, { status: { in: OPEN_CLAIM_STATUSES } }] } }),
        prisma.clientClaim.count({ where: { AND: [...and, { type: 'REMBOURSEMENT' }] } }),
        prisma.clientClaim.count(),
        prisma.clientClaim.count({ where: { status: { in: ['RESOLUE', 'REFUSEE'] } } }),
        prisma.client.aggregate({ _sum: { declaredExpeditionCount: true } }),
        prisma.expedition.count(),
        prisma.clientClaim.groupBy({ by: ['issueType'], _count: { _all: true } }),
    ]);

    const operationalVolume = (declaredVolume._sum.declaredExpeditionCount ?? 0) + detailedVolume;
    const qualityRate = operationalVolume > 0
        ? Math.max(0, Math.round((1 - totalClaims / operationalVolume) * 1000) / 10)
        : null;
    const resolutionRate = totalClaims > 0 ? Math.round((resolvedClaims / totalClaims) * 1000) / 10 : 100;
    const byIssue = Object.fromEntries(CLAIM_ISSUE_TYPES.map(issueType => [issueType, 0]));
    for (const group of issueGroups) {
        if (isClaimIssueType(group.issueType)) byIssue[group.issueType] = group._count._all;
    }

    return NextResponse.json({
        claims: claims.map(present),
        page,
        pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
        totals: {
            all: total,
            open,
            refunds,
            qualityRate,
            resolutionRate,
            operationalVolume,
            totalClaims,
            byIssue,
        },
    });
}
