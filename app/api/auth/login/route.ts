import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPasswordOrDecoy, signToken } from '@/lib/auth';
import { rateLimit, resetRateLimit } from '@/lib/rate-limit';
import { logSecurityEvent, SecurityEvent, SecuritySeverity } from '@/lib/security-logger';

export async function POST(req: Request) {
    try {
        // Rate limiting: Extract IP address
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() :
            req.headers.get('x-real-ip') ||
            'unknown';

        // Check rate limit (5 attempts per 15 minutes)
        const identifier = `login:${ip}`;
        const rateLimitResult = await rateLimit(identifier);

        if (!rateLimitResult.success) {
            // Log Rate Limit Exceeded
            await logSecurityEvent(SecurityEvent.RATE_LIMIT_EXCEEDED, {
                severity: SecuritySeverity.WARN,
                ip,
                details: { endpoint: 'login', limit: rateLimitResult.limit },
                req
            });

            const retryAfterSeconds = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
            return NextResponse.json(
                {
                    error: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
                    retryAfter: retryAfterSeconds
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(retryAfterSeconds),
                        'X-RateLimit-Limit': String(rateLimitResult.limit),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.floor(rateLimitResult.reset / 1000))
                    }
                }
            );
        }

        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Always spend the cost of a comparison, even when no account matched:
        // an early return here would answer an unknown e-mail far faster than a
        // wrong password and expose which addresses exist.
        const isValid = await verifyPasswordOrDecoy(password, user?.password);

        if (!user) {
            // Log Failed Login (Invalid User)
            await logSecurityEvent(SecurityEvent.AUTH_LOGIN_FAILED, {
                severity: SecuritySeverity.WARN,
                email, // Log the email attempted
                ip,
                details: { reason: 'User not found' },
                req
            });
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (!isValid) {
            // Log Failed Login (Invalid Password)
            await logSecurityEvent(SecurityEvent.AUTH_LOGIN_FAILED, {
                severity: SecuritySeverity.WARN,
                userId: user.id,
                email: user.email,
                ip,
                details: { reason: 'Invalid password' },
                req
            });
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Only after the password is proven: telling an anonymous caller that an
        // account is suspended would confirm the account exists.
        if (user.status !== 'ACTIVE') {
            await logSecurityEvent(SecurityEvent.ACCESS_DENIED, {
                severity: SecuritySeverity.WARN,
                userId: user.id,
                email: user.email,
                ip,
                details: { reason: 'Account inactive', status: user.status },
                req
            });
            return NextResponse.json({ error: 'Votre compte est suspendu. Veuillez contacter l\'administrateur.' }, { status: 403 });
        }

        // Generate JWT
        const token = await signToken({ userId: user.id, role: user.role, email: user.email });

        // Set Cookie
        const response = NextResponse.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        // Log Successful Login (Security Event)
        await logSecurityEvent(SecurityEvent.AUTH_LOGIN_SUCCESS, {
            severity: SecuritySeverity.INFO,
            userId: user.id,
            email: user.email,
            ip,
            req
        });

        // The legacy `logAction('User Login')` that used to sit here wrote a
        // second row for the same event — and an author-less one, because
        // logAction reads the session cookie off the *request*, which on a
        // login does not carry the token yet. The security event above
        // records the same thing with the user attached.

        // Reset rate limit on successful login
        await resetRateLimit(identifier);

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
