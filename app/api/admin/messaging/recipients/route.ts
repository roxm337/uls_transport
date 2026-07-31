import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSection } from '@/lib/server/staff-auth';

/**
 * Who the compose screen can write to: every client, plus each of their
 * named contacts.
 *
 * The screen used to load this from `/api/admin/leads`, an endpoint removed
 * with the lead pipeline this CRM no longer has — so the picker had been
 * silently empty and a recipient could only be typed by hand. The people
 * ULS Transport writes to are its clients and their contacts.
 */
export async function GET() {
    const guard = await requireSection('/admin/messaging');
    if (!guard.ok) return guard.response;

    try {
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                companyName: true,
                contactName: true,
                email: true,
                phone: true,
                notificationsEnabled: true,
                contacts: {
                    select: { id: true, name: true, role: true, email: true, phone: true, isPrimary: true },
                    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
                },
            },
            orderBy: { companyName: 'asc' },
        });

        const recipients = clients.flatMap(client => {
            // The company itself, when it has any way of being reached.
            const company = client.email || client.phone
                ? [{
                    id: client.id,
                    // `clientId` is carried separately from `id`: a contact
                    // has an id of its own, and the template picker needs the
                    // company's to offer that client's own templates.
                    clientId: client.id,
                    name: client.contactName || client.companyName,
                    company: client.companyName,
                    email: client.email ?? '',
                    phone: client.phone,
                    notificationsEnabled: client.notificationsEnabled,
                }]
                : [];

            const contacts = client.contacts
                .filter(c => c.email || c.phone)
                .map(c => ({
                    id: c.id,
                    clientId: client.id,
                    name: c.role ? `${c.name} — ${c.role}` : c.name,
                    company: client.companyName,
                    email: c.email ?? '',
                    phone: c.phone,
                    notificationsEnabled: client.notificationsEnabled,
                }));

            return [...company, ...contacts];
        });

        return NextResponse.json({ recipients });
    } catch (error) {
        console.error('Failed to fetch messaging recipients:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
