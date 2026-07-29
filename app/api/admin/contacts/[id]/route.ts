import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';
import { requireSection } from '@/lib/server/staff-auth';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection('/admin/clients');
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;
        const body = await req.json();

        const existing = await prisma.clientContact.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Contact introuvable.' }, { status: 404 });
        }

        const data: any = {};
        for (const key of ['role', 'email', 'phone']) {
            if (body[key] !== undefined) data[key] = body[key] || null;
        }
        if (body.name !== undefined) {
            if (!String(body.name).trim()) {
                return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 });
            }
            data.name = String(body.name).trim();
        }

        const contact = await prisma.$transaction(async tx => {
            if (body.isPrimary === true) {
                await tx.clientContact.updateMany({
                    where: { clientId: existing.clientId },
                    data: { isPrimary: false },
                });
                data.isPrimary = true;
            } else if (body.isPrimary === false) {
                data.isPrimary = false;
            }

            return tx.clientContact.update({ where: { id }, data });
        });

        await logAction('Update Client Contact', { id, name: contact.name });

        return NextResponse.json({ contact });
    } catch (error) {
        console.error('Failed to update contact:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection('/admin/clients');
    if (!guard.ok) return guard.response;

    try {
        const { id } = await params;
        const contact = await prisma.clientContact.findUnique({ where: { id } });
        if (!contact) {
            return NextResponse.json({ error: 'Contact introuvable.' }, { status: 404 });
        }

        await prisma.clientContact.delete({ where: { id } });
        await logAction('Delete Client Contact', { id, name: contact.name });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete contact:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
