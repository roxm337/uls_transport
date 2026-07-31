/**
 * Template Variables API
 * Get available variables for templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import {
    TemplateRenderer,
    STANDARD_VARIABLES,
    EXPEDITION_VARIABLES,
} from '@/lib/services/messaging/template-renderer';


/**
 * GET /api/admin/templates/variables
 * Get available template variables
 * Query params: clientId (optional - for real data preview)
 */
export async function GET(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        // Client and system fields, plus the shipment fields a transport
        // notification needs to be worth sending.
        const variables = { ...STANDARD_VARIABLES, ...EXPEDITION_VARIABLES };

        // If clientId provided, preview against that client's real data
        const client = clientId
            ? await prisma.client.findUnique({ where: { id: clientId } })
            : null;

        const sampleData = TemplateRenderer.getAvailableVariables(client);

        return NextResponse.json({
            available: Object.keys(variables),
            descriptions: variables,
            groups: {
                client: Object.keys(STANDARD_VARIABLES),
                expedition: Object.keys(EXPEDITION_VARIABLES),
            },
            sampleData
        });
    } catch (error) {
        console.error('[API] GET /api/admin/templates/variables error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
