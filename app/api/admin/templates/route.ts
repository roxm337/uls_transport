/**
 * Templates API - List and Create
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSection } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';


/**
 * GET /api/admin/templates
 * List templates with optional filters
 * Query params: type, scope, status, category, clientId
 * Note: Templates support 'global' and 'client' scopes only (no landing page specific templates)
 */
export async function GET(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'email' or 'whatsapp'
        const scope = searchParams.get('scope'); // 'global' or 'client'
        const status = searchParams.get('status'); // 'active' or 'inactive'
        const category = searchParams.get('category');
        const clientId = searchParams.get('clientId');

        // Build where clause
        const where: any = {};

        if (type) where.type = type;
        if (status) where.status = status;
        if (category) where.category = category;

        // Scope logic:
        // If scope is explicitly asked (e.g. 'global'), filter by it.
        // If clientId is provided, we want:
        // 1. Templates belonging to this client (clientId match)
        // 2. Global templates (scope == 'global')
        if (scope) {
            where.scope = scope;
            if (scope === 'client' && clientId) {
                where.clientId = clientId;
            }
        } else if (clientId) {
            where.OR = [
                { clientId: clientId },
                { scope: 'global' }
            ];
        }

        const templates = await prisma.messageTemplate.findMany({
            where,
            orderBy: [
                { isDefault: 'desc' }, // Defaults first
                { updatedAt: 'desc' }
            ],
            include: {
                _count: {
                    select: { messageLogs: true }
                }
            }
        });

        return NextResponse.json({
            templates,
            total: templates.length
        });
    } catch (error: any) {
        console.error('[API] GET /api/admin/templates error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/templates
 * Create new template
 * Note: Templates support 'global' and 'client' scopes only (no landing page specific templates)
 */
export async function POST(request: NextRequest) {
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const body = await request.json();
        const {
            name,
            type,
            subject,
            content,
            category,
            description,
            scope,
            clientId,
            status,
            isDefault
        } = body;

        // Validation
        if (!name || !type || !content) {
            return NextResponse.json(
                { error: 'Name, type, and content are required' },
                { status: 400 }
            );
        }

        if (type !== 'email' && type !== 'whatsapp') {
            return NextResponse.json(
                { error: 'Type must be "email" or "whatsapp"' },
                { status: 400 }
            );
        }

        if (type === 'email' && !subject) {
            return NextResponse.json(
                { error: 'Subject is required for email templates' },
                { status: 400 }
            );
        }

        // Validate scope - only 'global' or 'client' allowed
        const effectiveScope = scope === 'client' ? 'client' : 'global';

        // Check for duplicate name within same type and scope
        const existing = await prisma.messageTemplate.findFirst({
            where: {
                name,
                type,
                scope: effectiveScope,
                clientId: clientId || null,
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'A template with this name already exists in this scope' },
                { status: 409 }
            );
        }

        // If setting as default, unset other defaults for this type+scope
        if (isDefault) {
            await prisma.messageTemplate.updateMany({
                where: {
                    type,
                    scope: effectiveScope,
                    clientId: clientId || null,
                    isDefault: true
                },
                data: { isDefault: false }
            });
        }

        // Create template
        const template = await prisma.messageTemplate.create({
            data: {
                name,
                type,
                subject: type === 'email' ? subject : null,
                content,
                category: category || null,
                description: description || null,
                scope: effectiveScope,
                clientId: clientId || null,
                status: status || 'active',
                isDefault: isDefault || false,
            }
        });

        // Log action
        await logAction('template_created', {
            templateId: template.id,
            templateName: template.name,
            type: template.type
        });

        return NextResponse.json(
            { success: true, template },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('[API] POST /api/admin/templates error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
