import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Staff-only bootstrap for ULS Transport.
 *
 * Real clients come from `crm.xlsx` through `pnpm crm:import:apply`. Keeping
 * client and expedition demos out of this seed prevents production data from
 * being repopulated accidentally on a later deployment.
 */

const MANAGER_SECTIONS = [
    '/admin',
    '/admin/clients',
    '/admin/expeditions',
    '/admin/reclamations',
    '/admin/analytics',
    '/admin/messaging',
    '/admin/settings',
];

const PLACEHOLDER_PASSWORDS = new Set(['change-me-before-seeding', 'admin123', 'password']);

function resolveAdminPassword(): { password: string; generated: boolean } {
    const fromEnv = process.env.ADMIN_PASSWORD?.trim();
    if (!fromEnv) return { password: randomBytes(15).toString('base64url'), generated: true };

    const weak = PLACEHOLDER_PASSWORDS.has(fromEnv) || fromEnv.length < 12;
    if (weak && process.env.SEED_ALLOW_WEAK_PASSWORD !== 'true') {
        throw new Error('ADMIN_PASSWORD must contain at least 12 characters and must not be a known placeholder.');
    }
    return { password: fromEnv, generated: false };
}

async function upsertStaff(options: {
    email: string;
    name: string;
    password: string;
    role: 'ADMIN' | 'MANAGER';
    allowedSections?: string[];
}) {
    const existing = await prisma.user.findUnique({ where: { email: options.email } });
    const password = existing?.password ?? await hash(options.password, 10);
    return prisma.user.upsert({
        where: { email: options.email },
        update: {
            name: options.name,
            role: options.role,
            status: 'ACTIVE',
            allowedSections: options.allowedSections,
        },
        create: {
            email: options.email,
            name: options.name,
            password,
            role: options.role,
            status: 'ACTIVE',
            allowedSections: options.allowedSections,
        },
    });
}

async function main() {
    const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@uls-transport.com';
    const { password: adminPassword, generated } = resolveAdminPassword();
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    await upsertStaff({ email: adminEmail, name: 'Administrateur ULS', password: adminPassword, role: 'ADMIN' });

    const managerPassword = process.env.MANAGER_PASSWORD?.trim() || randomBytes(15).toString('base64url');
    const existingManager = await prisma.user.findUnique({ where: { email: 'exploitation@uls-transport.com' } });
    await upsertStaff({
        email: 'exploitation@uls-transport.com',
        name: 'Exploitation',
        password: managerPassword,
        role: 'MANAGER',
        allowedSections: MANAGER_SECTIONS,
    });

    console.log(`admin    ${adminEmail}${existingAdmin ? ' (existing password preserved)' : ''}`);
    if (!existingAdmin && generated) console.log(`generated admin password: ${adminPassword}`);
    console.log(`manager  exploitation@uls-transport.com${existingManager ? ' (existing password preserved)' : ''}`);
    if (!existingManager && !process.env.MANAGER_PASSWORD) console.log(`generated manager password: ${managerPassword}`);
    console.log('No demo clients or expeditions were seeded.');
}

main()
    .catch(error => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
