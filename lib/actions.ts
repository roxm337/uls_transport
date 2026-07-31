"use server";

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { verifyToken, verifyPassword, hashPassword } from '@/lib/auth';
import { logSecurityEvent, SecurityEvent, SecuritySeverity } from '@/lib/security-logger';

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

        // Get IP and User Agent. `x-real-ip` is the fallback for proxies that
        // don't set x-forwarded-for.
        const ipAddress =
            headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
            headerList.get('x-real-ip') ||
            null;
        const userAgent = headerList.get('user-agent') || null;

        // A loopback address used to abort the write entirely, which emptied
        // the audit trail in development and behind any proxy that forwards
        // as 127.0.0.1 — the trail matters most precisely where it was blank.
        // The address is recorded as-is instead; the reader can judge it.

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

        if (!token) return { success: false, error: 'Non authentifié.' };

        const payload = await verifyToken(token);
        if (!payload?.userId) return { success: false, error: 'Session invalide.' };

        const user = await prisma.user.update({
            where: { id: payload.userId as string },
            data: {
                name: data.name,
                email: data.email,
            },
            select: { id: true, name: true, email: true, role: true },
        });

        await logAction('update_profile', { fields: Object.keys(data) });

        revalidatePath('/admin/settings');

        return { success: true, user };
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return { success: false, error: 'Cette adresse e-mail est déjà utilisée.' };
        }
        console.error('Failed to update user profile:', error);
        return { success: false, error: 'Enregistrement impossible.' };
    }
}

/**
 * Change the signed-in account's own password.
 *
 * Settings could edit a name and an e-mail but not a password, so rotating
 * one meant asking an ADMIN to do it — and an ADMIN could not rotate their
 * own at all. The current password is required: a session left open on an
 * unlocked machine should not be enough to take the account over.
 */
export async function changeOwnPassword(data: {
    currentPassword: string;
    newPassword: string;
}) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return { success: false, error: 'Non authentifié.' };

        const payload = await verifyToken(token);
        if (!payload?.userId) return { success: false, error: 'Session invalide.' };

        if (!data.currentPassword || !data.newPassword) {
            return { success: false, error: 'Les deux mots de passe sont obligatoires.' };
        }

        if (data.newPassword.length < 8) {
            return {
                success: false,
                error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
            };
        }

        if (data.newPassword === data.currentPassword) {
            return {
                success: false,
                error: 'Le nouveau mot de passe doit être différent de l\'actuel.',
            };
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId as string },
            select: { id: true, email: true, password: true },
        });
        if (!user) return { success: false, error: 'Compte introuvable.' };

        if (!(await verifyPassword(data.currentPassword, user.password))) {
            await logSecurityEvent(SecurityEvent.AUTH_LOGIN_FAILED, {
                severity: SecuritySeverity.WARN,
                userId: user.id,
                email: user.email,
                details: { reason: 'Wrong current password on self-service change' },
            });
            return { success: false, error: 'Mot de passe actuel incorrect.' };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { password: await hashPassword(data.newPassword) },
        });

        await logSecurityEvent(SecurityEvent.AUTH_PASSWORD_CHANGE, {
            severity: SecuritySeverity.INFO,
            userId: user.id,
            email: user.email,
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to change password:', error);
        return { success: false, error: 'Changement de mot de passe impossible.' };
    }
}
