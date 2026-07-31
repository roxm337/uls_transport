import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAction } from '@/lib/actions';
import { validateCsrf } from '@/lib/csrf';
import { STAFF_ROLES, STAFF_STATUSES, isLastActiveAdmin } from '@/lib/server/staff-guards';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // CSRF Check
    const csrfError = await validateCsrf(req);
    if (csrfError) return csrfError;

    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;
        const data = await req.json();
        const { name, email, role, password, status, logo } = data;

        const oldUser = await prisma.user.findUnique({ where: { id } });
        if (!oldUser) {
            return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
        }

        // The CRM has exactly two roles. Anything else used to be written
        // straight through, leaving an account the session resolver refuses
        // and the sidebar cannot render.
        if (role !== undefined && !STAFF_ROLES.includes(role)) {
            return NextResponse.json(
                { error: 'Rôle invalide : ADMIN ou MANAGER.' },
                { status: 400 }
            );
        }

        if (status !== undefined && !STAFF_STATUSES.includes(status)) {
            return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
        }

        const losesAdmin =
            (role !== undefined && role !== 'ADMIN') ||
            (status !== undefined && status !== 'ACTIVE');

        // Two ways to lock everyone out of the administration, both of them
        // previously a single click: demote or suspend yourself, or do it to
        // the last remaining administrator.
        if (id === guard.session.userId && losesAdmin && oldUser.role === 'ADMIN') {
            return NextResponse.json(
                { error: "Vous ne pouvez pas retirer vos propres droits d'administrateur." },
                { status: 400 }
            );
        }

        if (losesAdmin && await isLastActiveAdmin(id)) {
            return NextResponse.json(
                { error: 'Impossible : ce compte est le dernier administrateur actif.' },
                { status: 400 }
            );
        }

        const updateData: {
            name?: string;
            email?: string;
            role?: string;
            status?: string;
            logo?: string | null;
            password?: string;
        } = { name, email, role, status };

        // Update logo if provided
        if (logo !== undefined) {
            updateData.logo = logo || null;
        }

        if (password && password.trim() !== '') {
            updateData.password = await hashPassword(password);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, status: true, logo: true },
        });

        await logAction('Update User', {
            id,
            old: { name: oldUser.name, email: oldUser.email, role: oldUser.role, status: oldUser.status },
            new: { name, email, role, status, passwordChanged: !!updateData.password }
        });

        return NextResponse.json({ user });
    } catch (error) {
        // A taken e-mail is a client mistake, not a server fault: it used to
        // surface as an opaque 500 with no indication of what to change.
        if (isUniqueViolation(error)) {
            return NextResponse.json(
                { error: 'Cette adresse e-mail est déjà utilisée.' },
                { status: 409 }
            );
        }
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // CSRF Check
    const csrfError = await validateCsrf(req);
    if (csrfError) return csrfError;

    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
        }

        if (id === guard.session.userId) {
            return NextResponse.json(
                { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
                { status: 400 }
            );
        }

        if (await isLastActiveAdmin(id)) {
            return NextResponse.json(
                { error: 'Impossible : ce compte est le dernier administrateur actif.' },
                { status: 400 }
            );
        }

        // ActionLog.userId is a nullable FK with no cascade, so rows written
        // by this account would block the delete. Detach them instead: the
        // audit trail keeps its entries, minus the author.
        await prisma.$transaction([
            prisma.actionLog.updateMany({ where: { userId: id }, data: { userId: null } }),
            prisma.user.delete({ where: { id } }),
        ]);

        await logAction('Delete User', { email: user.email, name: user.name, role: user.role });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/** Prisma's unique-constraint failure, without importing the runtime types. */
function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
    );
}
