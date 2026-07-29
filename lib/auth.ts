import { hash, compare } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// Validate JWT_SECRET is set - fail fast for security
if (!process.env.JWT_SECRET) {
    throw new Error(
        'FATAL SECURITY ERROR: JWT_SECRET environment variable is not set.\n' +
        'Please add JWT_SECRET to your .env file with a secure random string (minimum 32 characters).\n' +
        'Example: JWT_SECRET="your-super-secret-random-string-here"'
    );
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function hashPassword(password: string): Promise<string> {
    return hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
}

export async function signToken(payload: any): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        return null;
    }
}
