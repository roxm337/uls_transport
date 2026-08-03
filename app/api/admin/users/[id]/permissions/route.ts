import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/server/staff-auth';
import { prisma } from '@/lib/db';
import {
    ADMIN_ONLY_SECTIONS,
    ADMIN_SECTION_VALUES,
    resolveSections,
} from '@/lib/sections';


export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const guard = await requireAdmin();
        if (!guard.ok) return guard.response;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                allowedSections: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const allowedSections = user.role === 'MANAGER'
            ? resolveSections(user.role, user.allowedSections)
            : null;

        return NextResponse.json({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            allowedSections
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const guard = await requireAdmin();
        if (!guard.ok) return guard.response;

        const body = await request.json();
        const { allowedSections } = body;

        // Validate allowedSections is an array of strings
        if (!Array.isArray(allowedSections)) {
            return NextResponse.json(
                { error: 'allowedSections must be an array' },
                { status: 400 }
            );
        }

        const validSections = ADMIN_SECTION_VALUES;

        for (const section of allowedSections) {
            if (
                typeof section !== 'string'
                || !validSections.includes(section)
                || ADMIN_ONLY_SECTIONS.includes(section)
            ) {
                    return NextResponse.json(
                        { error: `Invalid section: ${section}` },
                        { status: 400 }
                    );
            }
        }

        // Check if user exists and is a manager
        const user = await prisma.user.findUnique({
            where: { id },
            select: { role: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.role !== 'MANAGER') {
            return NextResponse.json(
                { error: 'Can only set permissions for manager users' },
                { status: 400 }
            );
        }

        // Prepare update data
        const resolvedSections = resolveSections('MANAGER', allowedSections);
        const updateData: Prisma.UserUpdateInput = {
            allowedSections: resolvedSections,
        };

        // Update user permissions
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                allowedSections: true
            }
        });

        return NextResponse.json({
            success: true,
            user: {
                userId: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                allowedSections: resolveSections(updatedUser.role, updatedUser.allowedSections)
            }
        });
    } catch (error) {
        console.error('Error updating user permissions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
