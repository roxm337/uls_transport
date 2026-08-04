import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAction } from '@/lib/actions';
import { requireAdmin } from '@/lib/server/staff-auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicAccount(account: {
    email: string;
    enabled: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
} | null) {
    return account ? {
        exists: true,
        email: account.email,
        enabled: account.enabled,
        lastLoginAt: account.lastLoginAt,
        createdAt: account.createdAt,
    } : {
        exists: false,
        email: '',
        enabled: false,
        lastLoginAt: null,
        createdAt: null,
    };
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const account = await prisma.clientPortalAccount.findUnique({ where: { clientId: id } });
    return NextResponse.json({ account: publicAccount(account) });
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;
        const body = await req.json();
        const existing = await prisma.clientPortalAccount.findUnique({ where: { clientId: id } });
        const client = await prisma.client.findUnique({ where: { id }, select: { id: true, companyName: true } });
        if (!client) return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });

        const email = typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : existing?.email ?? '';
        const password = typeof body.password === 'string' ? body.password : '';
        const enabled = body.enabled === undefined ? existing?.enabled ?? true : Boolean(body.enabled);

        if (!EMAIL_PATTERN.test(email)) {
            return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 });
        }
        if (!existing && password.length < 12) {
            return NextResponse.json({ error: 'Un mot de passe de 12 caractères minimum est requis.' }, { status: 400 });
        }
        if (password && password.length < 12) {
            return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 12 caractères.' }, { status: 400 });
        }

        const account = existing
            ? await prisma.clientPortalAccount.update({
                where: { id: existing.id },
                data: {
                    email,
                    enabled,
                    ...(password ? { passwordHash: await hashPassword(password) } : {}),
                },
            })
            : await prisma.clientPortalAccount.create({
                data: {
                    clientId: id,
                    email,
                    enabled,
                    passwordHash: await hashPassword(password),
                },
            });

        await logAction(existing ? 'Update Client Portal' : 'Create Client Portal', {
            clientId: id,
            companyName: client.companyName,
            email,
            enabled,
            passwordChanged: Boolean(password),
        });

        return NextResponse.json({ account: publicAccount(account) });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'Cette adresse e-mail est déjà utilisée.' }, { status: 409 });
        }
        console.error('Failed to update client portal access:', error);
        return NextResponse.json({ error: 'Mise à jour de l’accès impossible.' }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const existing = await prisma.clientPortalAccount.findUnique({ where: { clientId: id } });
    if (!existing) return NextResponse.json({ success: true });

    await prisma.clientPortalAccount.delete({ where: { id: existing.id } });
    await logAction('Delete Client Portal', { clientId: id, email: existing.email });
    return NextResponse.json({ success: true });
}
