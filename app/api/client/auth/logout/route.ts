import { NextResponse } from 'next/server';
import { CLIENT_COOKIE } from '@/lib/server/client-auth';

export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.set(CLIENT_COOKIE, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
    });
    return response;
}
