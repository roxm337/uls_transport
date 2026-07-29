import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export enum SecuritySeverity {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL'
}

export enum SecurityEvent {
    // Auth Events
    AUTH_LOGIN_SUCCESS = 'auth.login.success',
    AUTH_LOGIN_FAILED = 'auth.login.failed',
    AUTH_REGISTER_SUCCESS = 'auth.register.success',
    AUTH_REGISTER_FAILED = 'auth.register.failed',
    AUTH_LOGOUT = 'auth.logout',
    AUTH_PASSWORD_CHANGE = 'auth.password.change',

    // Authorization & Access
    ACCESS_DENIED = 'access.denied',
    CSRF_VIOLATION = 'security.csrf.violation',
    RATE_LIMIT_EXCEEDED = 'security.ratelimit.exceeded',

    // User Management
    USER_CREATED = 'user.created',
    USER_DELETED = 'user.deleted',
    USER_SUSPENDED = 'user.suspended',
    USER_APPROVED = 'user.approved',
    USER_UPDATED = 'user.updated',

    // System
    SYSTEM_ERROR = 'system.error'
}

interface SecurityLogPayload {
    severity: SecuritySeverity;
    userId?: string;
    email?: string; // Fallback identifier
    ip?: string;
    details?: Record<string, any>;
    req?: Request; // Helper to extract IP/UA if not explicitly provided
}

/**
 * Standardized security logger
 * Logs critical security events to the database and console
 */
export async function logSecurityEvent(
    event: SecurityEvent,
    payload: SecurityLogPayload
) {
    try {
        let { severity, userId, email, ip, details, req } = payload;

        // Extract IP and User Agent if request object is provided
        let userAgent: string | undefined;

        if (req) {
            const forwarded = req.headers.get('x-forwarded-for');
            if (!ip) {
                ip = forwarded ? forwarded.split(',')[0].trim() :
                    req.headers.get('x-real-ip') ||
                    'unknown';
            }
            userAgent = req.headers.get('user-agent') || undefined;
        }

        // If no request object but we have access to headers (server action context)
        if (!ip || !userAgent) {
            try {
                const headerList = await headers();
                if (!ip) {
                    ip = headerList.get('x-forwarded-for')?.split(',')[0] ||
                        headerList.get('x-real-ip') ||
                        'unknown';
                }
                if (!userAgent) {
                    userAgent = headerList.get('user-agent') || undefined;
                }
            } catch (e) {
                // Ignore headers() error if called outside request context
            }
        }

        // Console logging for immediate visibility (especially in dev)
        const logMethod = severity === SecuritySeverity.ERROR || severity === SecuritySeverity.CRITICAL
            ? console.error
            : (severity === SecuritySeverity.WARN ? console.warn : console.log);

        logMethod(`[SECURITY][${severity}] ${event} - ${email || userId || 'Anonymous'} - ${ip}`, details);

        // Persist to database
        await prisma.actionLog.create({
            data: {
                action: event,
                details: JSON.stringify({
                    severity,
                    email,
                    ...details
                }),
                userId,
                ipAddress: ip,
                userAgent
            }
        });

        // TODO: Implement critical alerts here (e.g., send email to admin for CRITICAL events)
        if (severity === SecuritySeverity.CRITICAL) {
            // triggerCriticalAlert(event, payload);
        }

    } catch (error) {
        // Fallback robust logging - never fail the application because logging failed
        console.error('FAILED TO LOG SECURITY EVENT:', event, error);
    }
}
