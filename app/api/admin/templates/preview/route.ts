/**
 * Template Preview API
 * Preview template with variable substitution
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { TemplateRenderer } from '@/lib/services/messaging/template-renderer';


/**
 * POST /api/admin/templates/preview
 * Preview template with variable substitution
 * Body: { content, subject?, type, leadId?, sampleData? }
 */
export async function POST(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const body = await request.json();
        const { content, subject, type, clientId, sampleData } = body;

        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }

        let context: any = {};
        let variableValues: Record<string, string> = {};

        // Preview against a real client when one is supplied
        if (clientId) {
            const client = await prisma.client.findUnique({
                where: { id: clientId }
            });

            if (client) {
                context.client = client;
                variableValues = TemplateRenderer.getAvailableVariables(client);
            }
        } else if (sampleData) {
            // Use provided sample data
            variableValues = sampleData;
            context.customData = sampleData;
        } else {
            // Use default sample data
            variableValues = TemplateRenderer.getSampleData();
            context.customData = variableValues;
        }

        // Render template
        const renderedContent = TemplateRenderer.render(content, context);
        const renderedSubject = subject ? TemplateRenderer.render(subject, context) : undefined;

        // Convert to HTML if email
        const html = type === 'email' ? TemplateRenderer.textToHtml(renderedContent) : undefined;

        // Extract variables used
        const usedVariables = TemplateRenderer.extractVariables(content);
        if (subject) {
            usedVariables.push(...TemplateRenderer.extractVariables(subject));
        }

        return NextResponse.json({
            preview: {
                subject: renderedSubject,
                content: renderedContent,
                html,
            },
            variables: variableValues,
            usedVariables: Array.from(new Set(usedVariables))
        });
    } catch (error: any) {
        console.error('[API] POST /api/admin/templates/preview error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
