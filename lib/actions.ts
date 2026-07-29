"use server";

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function logAction(action: string, details?: any) {
    try {
        const cookieStore = await cookies();
        const headerList = await headers();
        const token = cookieStore.get('auth-token')?.value;

        let userId: string | undefined;

        if (token) {
            const payload = await verifyToken(token);
            if (payload?.userId) {
                userId = payload.userId as string;
            }
        }

        // Get IP and User Agent
        const ipAddress = headerList.get('x-forwarded-for')?.split(',')[0] || null;
        const userAgent = headerList.get('user-agent') || null;

       // Skip logging for local IP addresses
        const localIps = ['::ffff:127.0.0.1', '127.0.0.1', '::1', 'localhost'];
        if (ipAddress && localIps.includes(ipAddress)) {
            return;
        }

        await prisma.actionLog.create({
            data: {
                action,
                details: details ? JSON.stringify(details) : undefined,
                userId,
                ipAddress,
                userAgent,
            },
        });

    } catch (error) {
        console.error('Failed to log action:', error);
        // We don't want to fail the request just because logging failed
    }
}

export async function getAdminSetting(key: string, defaultValue: string): Promise<string> {
    try {
        console.log(`[getAdminSetting] Fetching key: ${key}`);
        const setting = await prisma.adminSettings.findUnique({
            where: { key },
        });
        const value = setting?.value ?? defaultValue;
        console.log(`[getAdminSetting] Found value for ${key}: ${value}`);
        return value;
    } catch (error) {
        console.error(`Failed to get setting ${key}:`, error);
        return defaultValue;
    }
}

export async function updateAdminSetting(key: string, value: string) {
    try {
        console.log(`[updateAdminSetting] Updating ${key} to ${value}`);
        const setting = await prisma.adminSettings.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });

        await logAction('update_setting', { key, value });

        // Revalidate the settings page
        revalidatePath('/admin/settings');

        console.log(`[updateAdminSetting] Successfully updated ${key}`);
        return { success: true, setting };
    } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        return { success: false, error: 'Failed to update setting' };
    }
}

export async function getUserProfile() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) return null;

        const payload = await verifyToken(token);
        if (!payload?.userId) return null;

        const user = await prisma.user.findUnique({
            where: { id: payload.userId as string },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            }
        });

        return user;
    } catch (error) {
        console.error('Failed to get user profile:', error);
        return null;
    }
}

export async function updateUserProfile(data: { name?: string; email?: string }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) return { success: false, error: 'Not authenticated' };

        const payload = await verifyToken(token);
        if (!payload?.userId) return { success: false, error: 'Invalid token' };

        const user = await prisma.user.update({
            where: { id: payload.userId as string },
            data: {
                name: data.name,
                email: data.email,
            },
        });

        await logAction('update_profile', { fields: Object.keys(data) });

        revalidatePath('/admin/settings');

        return { success: true, user };
    } catch (error: any) {
        console.error('Failed to update user profile:', error);
        return { success: false, error: error.message || 'Failed to update profile' };
    }
}
