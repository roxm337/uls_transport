/**
 * WaSender Groups Proxy
 * Fetches WhatsApp groups from WaSender API using the stored (encrypted) API key
 * GET /api/admin/messaging/groups?clientId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { decryptCredential } from '@/lib/services/messaging';


export async function GET(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
        }

        // Load stored config to get API key and URL
        const config = await prisma.messagingConfig.findFirst({
            where: { clientId },
        });

        if (!config || !config.whatsappApiKey) {
            return NextResponse.json(
                { error: 'WhatsApp not configured for this client' },
                { status: 400 }
            );
        }

        const apiKey = decryptCredential(config.whatsappApiKey);
        // Derive the base URL from the send-message URL (strip the path)
        const apiBaseUrl = (config.whatsappApiUrl || 'https://www.wasenderapi.com/api/send-message')
            .replace(/\/send-message$/, '');

        const groupsUrl = `${apiBaseUrl}/groups`;

        const response = await fetch(groupsUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            console.error('[GroupsProxy] WaSender error:', response.status, errBody);
            return NextResponse.json(
                { error: `WaSender API error: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Normalize: WaSender returns { success, data: [{jid, name, imgUrl}] }
        const groups: { jid: string; name: string }[] = Array.isArray(data?.data)
            ? data.data.map((g: any) => ({ jid: g.jid, name: g.name || g.jid }))
            : [];

        return NextResponse.json({ success: true, groups });
    } catch (error: any) {
        console.error('[GroupsProxy] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
