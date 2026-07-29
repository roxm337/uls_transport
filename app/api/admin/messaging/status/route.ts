import { NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { MessagingService } from '@/lib/services/messaging/messaging-service';


export async function GET(request: Request) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const { searchParams } = new URL(request.url);
        const scopeId = searchParams.get('scopeId');

        if (!scopeId) {
            return NextResponse.json({ error: 'scopeId is required' }, { status: 400 });
        }

        const messagingService = new MessagingService();
        const status = await messagingService.getStatus(scopeId);

        return NextResponse.json(status);
    } catch (error) {
        console.error('Failed to get messaging status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
