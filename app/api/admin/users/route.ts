import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAction } from '@/lib/actions';
import { DEFAULT_MANAGER_SECTIONS } from '@/lib/sections';


export async function GET() {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, status: true, logo: true, createdAt: true, allowedSections: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ users });
    } catch (error) {
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
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
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
