import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAction } from '@/lib/actions';


import { validateCsrf } from '@/lib/csrf';

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
        const { name, email, role, password, status, logo, clientMessagingEnabled, dashboardEnabled, messagingEnabled } = data;

        // Fetch user before update for logging
        const oldUser = await prisma.user.findUnique({ where: { id } });

        const updateData: any = {
            name,
            email,
            role,
            status,
        };

        // Update logo if provided
        if (logo !== undefined) {
            updateData.logo = logo;
        }

        if (password && password.trim() !== '') {
            updateData.password = await hashPassword(password);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
        });

        // Store CLIENT feature flags in allowedSections
        if (role === 'CLIENT' && (typeof dashboardEnabled === 'boolean' || typeof messagingEnabled === 'boolean')) {
            const existing = (oldUser?.allowedSections ?? {}) as Record<string, unknown>;
            const sections = Array.isArray(existing) ? {} : existing;
            const updates: Record<string, unknown> = { ...sections };
            if (typeof dashboardEnabled === 'boolean') updates.dashboardEnabled = dashboardEnabled;
            if (typeof messagingEnabled === 'boolean') updates.messagingEnabled = messagingEnabled;
            await prisma.user.update({
                where: { id },
                data: { allowedSections: updates as any },
            });
        }

        if (role === 'CLIENT' && typeof clientMessagingEnabled === 'boolean') {
            await prisma.messagingConfig.upsert({
                where: { clientId: id },
                update: { clientMessagingEnabled },
                create: {
                    clientId: id,
                    type: 'client',
                    clientMessagingEnabled,
                },
            });
        }

        await logAction('Update User', {
            id,
            old: { name: oldUser?.name, email: oldUser?.email, role: oldUser?.role },
            new: { name, email, role, passwordChanged: !!updateData.password }
        });

        return NextResponse.json({ user });
    } catch (error) {
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

        // Fetch user before deletion to log details
        const user = await prisma.user.findUnique({ where: { id } });

        await prisma.user.delete({
            where: { id },
        });

        if (user) {
            await logAction('Delete User', { email: user.email, name: user.name });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
