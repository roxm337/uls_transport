import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signToken, verifyPassword } from '@/lib/auth';
import { rateLimit, resetRateLimit } from '@/lib/rate-limit';
import { CLIENT_COOKIE } from '@/lib/server/client-auth';

function requestIp(req: Request): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
}

export async function POST(req: Request) {
    const ip = requestIp(req);
    const identifier = `client-login:${ip}`;
    const attempt = rateLimit(identifier, 5, 15 * 60 * 1000);

    if (!attempt.success) {
        return NextResponse.json(
            { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil((attempt.reset - Date.now()) / 1000)) } },
        );
    }

    try {
        const body = await req.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!email || !password) {
            return NextResponse.json({ error: 'E-mail et mot de passe requis.' }, { status: 400 });
        }

        const account = await prisma.clientPortalAccount.findUnique({
            where: { email },
            include: { client: { select: { id: true, status: true } } },
        });

        const valid = account ? await verifyPassword(password, account.passwordHash) : false;
        if (!account || !valid) {
            return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
        }

        if (!account.enabled || account.client.status === 'Suspendu') {
            return NextResponse.json({ error: 'Cet accès client est désactivé.' }, { status: 403 });
        }

        const token = await signToken({
            userId: account.id,
            role: 'CLIENT',
            email: account.email,
            clientId: account.client.id,
        });

        await prisma.clientPortalAccount.update({
            where: { id: account.id },
            data: { lastLoginAt: new Date() },
        });
        resetRateLimit(identifier);

        const response = NextResponse.json({ success: true });
        response.cookies.set(CLIENT_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24,
            path: '/',
        });
        return response;
    } catch (error) {
        console.error('Client portal login failed:', error);
        return NextResponse.json({ error: 'Connexion momentanément indisponible.' }, { status: 500 });
    }
}
