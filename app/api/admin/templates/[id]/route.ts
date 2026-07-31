/**
 * Templates API - Get, Update, Delete Single Template
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireSection, requireAdmin } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/actions';


/**
 * GET /api/admin/templates/[id]
 * Get single template by ID
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const template = await prisma.messageTemplate.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { messageLogs: true }
                }
            }
        });

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ template });
    } catch (error) {
        console.error('[API] GET /api/admin/templates/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/templates/[id]
 * Update template
 */
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const guard = await requireSection('/admin/messaging');
        if (!guard.ok) return guard.response;

        const body = await request.json();
        const {
            name,
            subject,
            content,
            category,
            description,
            status,
            isDefault
        } = body;

        // Get current template
        const currentTemplate = await prisma.messageTemplate.findUnique({
            where: { id: params.id }
        });

        if (!currentTemplate) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Validation
        if (content !== undefined && !content) {
            return NextResponse.json(
                { error: 'Content cannot be empty' },
                { status: 400 }
            );
        }

        if (currentTemplate.type === 'email' && subject !== undefined && !subject) {
            return NextResponse.json(
                { error: 'Subject cannot be empty for email templates' },
                { status: 400 }
            );
        }

        // Check for duplicate name if name is being changed
        if (name && name !== currentTemplate.name) {
            const existing = await prisma.messageTemplate.findFirst({
                where: {
                    name,
                    type: currentTemplate.type,
                    scope: currentTemplate.scope,
                    clientId: currentTemplate.clientId,
                    id: { not: params.id }
                }
            });

            if (existing) {
                return NextResponse.json(
                    { error: 'A template with this name already exists in this scope' },
                    { status: 409 }
                );
            }
        }

        // If setting as default, unset other defaults for this type+scope
        if (isDefault === true) {
            await prisma.messageTemplate.updateMany({
                where: {
                    type: currentTemplate.type,
                    scope: currentTemplate.scope,
                    clientId: currentTemplate.clientId,
                    isDefault: true,
                    id: { not: params.id }
                },
                data: { isDefault: false }
            });
        }

        // Build update data
        const updateData: Prisma.MessageTemplateUpdateInput & Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (subject !== undefined) updateData.subject = subject;
        if (content !== undefined) updateData.content = content;
        if (category !== undefined) updateData.category = category;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (isDefault !== undefined) updateData.isDefault = isDefault;

        // Update template
        const template = await prisma.messageTemplate.update({
            where: { id: params.id },
            data: updateData
        });

        // Log action
        await logAction('template_updated', {
            templateId: template.id,
            templateName: template.name,
            type: template.type
        });

        return NextResponse.json({ success: true, template });
    } catch (error) {
        console.error('[API] PATCH /api/admin/templates/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/templates/[id]
 * Delete template
 */
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        // Destructive, so ADMIN-only — matching every other delete in the CRM.
        const guard = await requireAdmin();
        if (!guard.ok) return guard.response;

        // Get template for logging
        const template = await prisma.messageTemplate.findUnique({
            where: { id: params.id }
        });

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Delete template (MessageLog references will be set to null due to onDelete: SetNull)
        await prisma.messageTemplate.delete({
            where: { id: params.id }
        });

        // Log action
        await logAction('template_deleted', {
            templateId: template.id,
            templateName: template.name,
            type: template.type
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] DELETE /api/admin/templates/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
