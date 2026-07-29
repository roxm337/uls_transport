/**
 * Template Variables API
 * Get available variables for templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { TemplateRenderer, STANDARD_VARIABLES } from '@/lib/services/messaging/template-renderer';


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

        // Start with standard variables
        const variables = { ...STANDARD_VARIABLES };
        let sampleData: Record<string, string> | undefined;

        // If clientId provided, preview against that client's real data
        if (clientId) {
            const client = await prisma.client.findUnique({
                where: { id: clientId }
            });

            if (client) {
                sampleData = TemplateRenderer.getAvailableVariables(client);
            }
        } else {
            // Return sample data
            sampleData = TemplateRenderer.getSampleData();
        }

        return NextResponse.json({
            available: Object.keys(variables),
            descriptions: variables,
            sampleData
        });
    } catch (error: any) {
        console.error('[API] GET /api/admin/templates/variables error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
