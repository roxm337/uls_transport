import { NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { MessagingService } from '@/lib/services/messaging/messaging-service';


/**
 * What is set up and what is switched on, for the ULS configuration.
 *
 * No longer takes a `scopeId`: there is one configuration, so "the status
 * of client X's messaging" no longer means anything.
 */
export async function GET() {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const status = await new MessagingService().getStatus();

        return NextResponse.json(status);
    } catch (error) {
        console.error('Failed to get messaging status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
