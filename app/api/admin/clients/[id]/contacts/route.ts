import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';
import { requireSection } from '@/lib/server/staff-auth';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireSection('/admin/clients');
    if (!guard.ok) return guard.response;

    try {
        const { id: clientId } = await params;
        const body = await req.json();

        if (!body.name || !String(body.name).trim()) {
            return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 });
        }

        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
        }

        const isPrimary = Boolean(body.isPrimary);

        const contact = await prisma.$transaction(async tx => {
            // Only one primary contact per client.
            if (isPrimary) {
                await tx.clientContact.updateMany({
                    where: { clientId },
                    data: { isPrimary: false },
                });
            }

            return tx.clientContact.create({
                data: {
                    clientId,
                    name: String(body.name).trim(),
                    role: body.role || null,
                    email: body.email || null,
                    phone: body.phone || null,
                    isPrimary,
                },
            });
        });

        await logAction('Create Client Contact', { clientId, name: contact.name });

        return NextResponse.json({ contact }, { status: 201 });
    } catch (error) {
        console.error('Failed to create contact:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
