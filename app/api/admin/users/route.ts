import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAction } from '@/lib/actions';
import { DEFAULT_MANAGER_SECTIONS } from '@/lib/sections';
import { STAFF_ROLES } from '@/lib/server/staff-guards';


export async function GET() {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, status: true, logo: true, createdAt: true, allowedSections: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ users });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { logSecurityEvent, SecurityEvent, SecuritySeverity } from '@/lib/security-logger';
import { validateCsrf } from '@/lib/csrf';

export async function POST(req: Request) {
    // CSRF Check
    const csrfError = await validateCsrf(req);
    if (csrfError) return csrfError;

    const guard = await requireAdmin();
    if (!guard.ok) {
        await logSecurityEvent(SecurityEvent.ACCESS_DENIED, {
            severity: SecuritySeverity.WARN,
            details: { reason: 'Unauthorized admin access', action: 'create_user' },
            req
        });
        return guard.response;
    }

    try {
        const body = await req.json();
        const { name, email, password, role, logo } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'E-mail et mot de passe sont obligatoires.' },
                { status: 400 }
            );
        }

        // A password shorter than this is not worth hashing: the account it
        // protects can suspend colleagues and read the whole audit trail.
        if (String(password).length < 8) {
            return NextResponse.json(
                { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
                { status: 400 }
            );
        }

        if (role !== undefined && !STAFF_ROLES.includes(role)) {
            return NextResponse.json(
                { error: 'Rôle invalide : ADMIN ou MANAGER.' },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json(
                { error: 'Cette adresse e-mail est déjà utilisée.' },
                { status: 409 }
            );
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'MANAGER',
                status: 'ACTIVE', // Automatically active if created by admin
                logo: logo || null,
                allowedSections: (role || 'MANAGER') === 'MANAGER'
                    ? DEFAULT_MANAGER_SECTIONS
                    : [],
            },
        });

        // `userId` is the actor, so it must be the admin who performed the
        // creation — passing the new user's id here made the audit trail read
        // as though the account had created itself.
        await logSecurityEvent(SecurityEvent.USER_CREATED, {
            severity: SecuritySeverity.INFO,
            userId: guard.session.userId,
            email: guard.session.email,
            details: {
                targetUser: { id: user.id, email: user.email, role: user.role },
            },
            req
        });

        // Also legacy log
        await logAction('Create User', { email: user.email, role: user.role });

        return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });

    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
