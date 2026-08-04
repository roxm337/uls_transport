import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
    crmClientIdentity,
    DEMO_CLIENT_NAMES,
    normalizeCrmRow,
    type CrmSourceRow,
} from '../lib/server/crm-import';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const workbookArg = process.argv.find(arg => arg.endsWith('.xlsx')) ?? 'crm.xlsx';
const workbookPath = resolve(process.cwd(), workbookArg);

function unzip(entry: string): string {
    return execFileSync('unzip', ['-p', workbookPath, entry], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
    });
}

function decodeXml(value: string): string {
    return value
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function parseWorkbook(): CrmSourceRow[] {
    if (!existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

    const sharedStrings = [...unzip('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match =>
        [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(part => decodeXml(part[1]))
            .join('')
    );
    const sheetXml = unzip('xl/worksheets/sheet1.xml');
    const rows: Array<{ rowNumber: number; cells: Record<string, string> }> = [];

    for (const rowMatch of sheetXml.matchAll(/<row\s[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells: Record<string, string> = {};
        for (const cellMatch of rowMatch[2].matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
            const column = cellMatch[1].match(/r="([A-Z]+)\d+"/)?.[1];
            const raw = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
            if (!column || raw === undefined) continue;
            cells[column] = /t="s"/.test(cellMatch[1]) ? sharedStrings[Number(raw)] ?? '' : raw;
        }
        rows.push({ rowNumber: Number(rowMatch[1]), cells });
    }

    const header = rows.find(row => row.cells.A?.trim().toLocaleUpperCase('fr-FR') === 'SOCIETE');
    if (!header) throw new Error('The SOCIETE header was not found in crm.xlsx.');

    return rows
        .filter(row => row.rowNumber > header.rowNumber && row.cells.A && row.cells.B && row.cells.G)
        .map(row => ({
            rowNumber: row.rowNumber,
            company: row.cells.A,
            siret: row.cells.B,
            contact: row.cells.C ?? '',
            city: row.cells.D ?? '',
            services: row.cells.E ?? '',
            expeditionCount: Number(row.cells.F) || 0,
            status: row.cells.G,
        }));
}

async function main() {
    const clients = parseWorkbook().map(normalizeCrmRow);
    if (clients.length === 0) throw new Error('No client rows were found in crm.xlsx.');

    const identities = new Set<string>();
    for (const client of clients) {
        const identity = crmClientIdentity(client);
        if (identities.has(identity)) throw new Error(`Duplicate source row identity: ${identity}`);
        identities.add(identity);
        if (!/^\d{3}(?: \d{3}){2} \d{5}$/.test(client.siret)) {
            throw new Error(`Invalid SIRET format on source row ${client.sourceRow}: ${client.siret}`);
        }
        if (!client.email) throw new Error(`Missing contact e-mail on source row ${client.sourceRow}.`);
    }

    const siretGroups = new Map<string, number[]>();
    for (const client of clients) {
        siretGroups.set(client.siret, [...(siretGroups.get(client.siret) ?? []), client.sourceRow]);
    }
    const repeatedSirets = [...siretGroups.entries()].filter(([, rows]) => rows.length > 1);

    async function countWorkbookMatches(): Promise<number> {
        const rows = await prisma.client.findMany({
            where: { siret: { in: [...new Set(clients.map(client => client.siret))] } },
            select: { companyName: true, siret: true, city: true },
        });
        const identities = new Set(rows.map(row => crmClientIdentity({
            companyName: row.companyName,
            siret: row.siret ?? '',
            city: row.city ?? '',
        })));
        return clients.filter(client => identities.has(crmClientIdentity(client))).length;
    }

    const seedClients = await prisma.client.findMany({
        where: { companyName: { in: [...DEMO_CLIENT_NAMES] } },
        select: {
            id: true,
            companyName: true,
            _count: { select: { expeditions: true, contacts: true, claims: true } },
            portalAccount: { select: { id: true } },
        },
    });
    const existingRealClients = await prisma.client.findMany({
        where: { companyName: { notIn: [...DEMO_CLIENT_NAMES] } },
        select: { companyName: true, city: true, siret: true },
        orderBy: { companyName: 'asc' },
    });
    const expeditionTotal = await prisma.expedition.count();

    console.log(`CRM workbook: ${clients.length} client site(s), ${new Set(clients.map(c => c.companyName)).size} company name(s).`);
    console.log(`Declared historical expeditions: ${clients.reduce((sum, client) => sum + client.expeditionCount, 0)} (stored as aggregate volume; no fake shipments created).`);
    console.log(`Seed clients targeted for replacement: ${seedClients.length}. Existing non-seed clients preserved: ${existingRealClients.length}.`);
    console.log(`Current database totals: ${seedClients.length + existingRealClients.length} client(s), ${expeditionTotal} detailed expedition(s).`);
    console.log(`Workbook rows already present: ${await countWorkbookMatches()}/${clients.length}.`);
    if (seedClients.length) console.log(`  remove: ${seedClients.map(client => client.companyName).join(', ')}.`);
    if (existingRealClients.length) console.log(`  preserve: ${existingRealClients.map(client => `${client.companyName}${client.city ? ` (${client.city})` : ''}`).join(', ')}.`);
    if (repeatedSirets.length) {
        console.log(`Repeated SIRET retained by site identity: ${repeatedSirets.map(([siret, rows]) => `${siret} (rows ${rows.join(', ')})`).join('; ')}.`);
    }

    if (!apply) {
        console.log('\nDry run only. Re-run with --apply to replace seed clients and import crm.xlsx.');
        for (const client of clients) {
            console.log(`  row ${client.sourceRow}: ${client.companyName} · ${client.city} · ${client.email} · ${client.status}`);
        }
        return;
    }

    const manager = await prisma.user.findUnique({
        where: { email: 'exploitation@uls-transport.com' },
        select: { id: true },
    });

    const result = await prisma.$transaction(async tx => {
        const removed = await tx.client.deleteMany({
            where: { id: { in: seedClients.map(client => client.id) } },
        });
        let created = 0;
        let updated = 0;

        for (const client of clients) {
            const existing = await tx.client.findFirst({
                where: {
                    companyName: client.companyName,
                    siret: client.siret,
                    city: client.city,
                },
                select: { id: true },
            });
            const data = {
                companyName: client.companyName,
                siret: client.siret,
                contactName: client.contactName,
                email: client.email,
                city: client.city,
                country: 'France',
                status: client.status,
                services: JSON.stringify(client.services),
                accountManagerId: manager?.id ?? null,
                declaredExpeditionCount: client.expeditionCount,
                notes: [
                    `Import crm.xlsx — ligne ${client.sourceRow}.`,
                    `Services source : ${client.sourceServices}.`,
                    `Historique déclaré : ${client.expeditionCount} expédition(s) (détail non fourni).`,
                ].join('\n'),
            };

            if (existing) {
                await tx.client.update({ where: { id: existing.id }, data });
                updated += 1;
            } else {
                await tx.client.create({ data });
                created += 1;
            }
        }
        return { removed: removed.count, created, updated };
    }, { timeout: 30_000 });

    console.log(`\nImport applied: ${result.removed} seed client(s) removed, ${result.created} real client site(s) created, ${result.updated} updated.`);
    const [remainingSeedClients, matchingWorkbookRows] = await Promise.all([
        prisma.client.count({ where: { companyName: { in: [...DEMO_CLIENT_NAMES] } } }),
        countWorkbookMatches(),
    ]);
    if (remainingSeedClients !== 0 || matchingWorkbookRows !== clients.length) {
        throw new Error(`Post-import verification failed: ${remainingSeedClients} seed client(s), ${matchingWorkbookRows}/${clients.length} workbook rows.`);
    }
    console.log(`Verified: 0 seed clients remain and ${matchingWorkbookRows}/${clients.length} workbook rows are present.`);
}

main()
    .catch(error => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
