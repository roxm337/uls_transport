import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

/**
 * ULS Transport CRM seed.
 *
 * Idempotent: staff accounts are upserted by e-mail, client companies by their
 * raison sociale, and demo expeditions are only created when none exist.
 *
 * Set SEED_DEMO_DATA=false to seed staff accounts only (production).
 */

const SEED_DEMO_DATA = process.env.SEED_DEMO_DATA !== 'false'

/** Mirrors AVAILABLE_SECTIONS in ManagerPermissions.tsx. */
const MANAGER_SECTIONS = [
    '/admin', '/admin/clients', '/admin/expeditions', '/admin/analytics', '/admin/messaging',
]

const PLACEHOLDER_PASSWORDS = new Set([
    'change-me-before-seeding', 'admin123', 'password',
])

function resolveAdminPassword(): { password: string; generated: boolean } {
    const fromEnv = process.env.ADMIN_PASSWORD?.trim()

    if (!fromEnv) {
        return { password: randomBytes(15).toString('base64url'), generated: true }
    }

    const weak = PLACEHOLDER_PASSWORDS.has(fromEnv) || fromEnv.length < 12
    const allowWeak = process.env.SEED_ALLOW_WEAK_PASSWORD === 'true'

    if (weak && !allowWeak) {
        throw new Error(
            `ADMIN_PASSWORD "${fromEnv}" is a known placeholder or shorter than 12 characters.\n` +
            'Either set a strong password in .env.local, unset it to have one generated,\n' +
            'or set SEED_ALLOW_WEAK_PASSWORD=true to accept it (local development only).'
        )
    }

    if (weak) {
        console.warn('  ⚠  Weak ADMIN_PASSWORD accepted via SEED_ALLOW_WEAK_PASSWORD.')
        console.warn('     Never do this on a deployed environment.\n')
    }

    return { password: fromEnv, generated: false }
}

/** Deterministic date N days before now, fixed hour so runs stay stable. */
function daysAgo(days: number, hour = 9): Date {
    const d = new Date()
    d.setDate(d.getDate() - days)
    d.setHours(hour, 0, 0, 0)
    return d
}

async function upsertStaff(opts: {
    email: string
    name: string
    password: string
    role: 'ADMIN' | 'MANAGER'
    allowedSections?: unknown
}) {
    const hashed = await hash(opts.password, 10)

    return prisma.user.upsert({
        where: { email: opts.email },
        // Never clobber an existing password on re-run.
        update: {
            name: opts.name,
            role: opts.role,
            status: 'ACTIVE',
            ...(opts.allowedSections !== undefined
                ? { allowedSections: opts.allowedSections as string[] }
                : {}),
        },
        create: {
            email: opts.email,
            name: opts.name,
            password: hashed,
            role: opts.role,
            status: 'ACTIVE',
            ...(opts.allowedSections !== undefined
                ? { allowedSections: opts.allowedSections as string[] }
                : {}),
        },
    })
}

async function main() {
    console.log('Seeding ULS Transport CRM …\n')

    // ── Staff ─────────────────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@uls-transport.com'
    const { password: adminPassword, generated } = resolveAdminPassword()
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })

    await upsertStaff({
        email: adminEmail,
        name: 'Administrateur ULS',
        password: adminPassword,
        role: 'ADMIN',
    })

    if (existingAdmin) {
        console.log(`  admin    ${adminEmail} (existait déjà — mot de passe inchangé)`)
    } else {
        console.log(`  admin    ${adminEmail}`)
        if (generated) {
            console.log(`\n  ⚠  Mot de passe administrateur généré : ${adminPassword}`)
            console.log('     Copiez-le maintenant, il n’est stocké nulle part ailleurs.\n')
        }
    }

    const manager = await upsertStaff({
        email: 'exploitation@uls-transport.com',
        name: 'Exploitation',
        password: process.env.MANAGER_PASSWORD?.trim() || randomBytes(12).toString('base64url'),
        role: 'MANAGER',
        allowedSections: MANAGER_SECTIONS,
    })
    console.log(`  manager  ${manager.email}`)

    if (!SEED_DEMO_DATA) {
        console.log('\nSEED_DEMO_DATA=false — comptes seuls, aucune donnée de démonstration.')
        return
    }

    // ── Client companies ──────────────────────────────────────────────
    const clientDefs = [
        {
            companyName: 'Transports Bernard',
            siret: '812 345 678 00019',
            vatNumber: 'FR12812345678',
            contactName: 'Camille Rousseau',
            email: 'c.rousseau@transports-bernard.fr',
            phone: '+33 1 64 55 12 30',
            addressLine: '14 rue des Entrepôts',
            postalCode: '94150', city: 'Rungis',
            status: 'Actif',
            services: ['messagerie-nationale-internationale', 'transport-urgent', 'tournees-regulieres'],
            paymentTerms: '30 jours fin de mois',
            notes: 'Quai accessible de 6 h à 14 h. Prise de RDV obligatoire.',
            contacts: [
                { name: 'Camille Rousseau', role: 'Responsable logistique', email: 'c.rousseau@transports-bernard.fr', phone: '+33 6 12 45 78 90', isPrimary: true },
                { name: 'Marc Fillon', role: 'Comptabilité', email: 'compta@transports-bernard.fr', phone: '+33 1 64 55 12 31', isPrimary: false },
            ],
        },
        {
            companyName: 'Groupe Mercier',
            siret: '423 987 654 00027',
            vatNumber: 'FR98423987654',
            contactName: 'Julien Faure',
            email: 'logistique@groupe-mercier.fr',
            phone: '+33 1 60 77 04 18',
            addressLine: '8 avenue de l’Industrie',
            postalCode: '77000', city: 'Melun',
            status: 'Actif',
            services: ['demenagement', 'vehicules-avec-chauffeurs', 'plateaux-bras-de-grue'],
            paymentTerms: '45 jours',
            notes: 'Contrat cadre signé, extension au site de Melun en cours.',
            contacts: [
                { name: 'Julien Faure', role: 'Directeur logistique', email: 'j.faure@groupe-mercier.fr', phone: '+33 6 45 78 01 23', isPrimary: true },
            ],
        },
        {
            companyName: 'Fruidis SAS',
            siret: '509 112 233 00014',
            contactName: 'Olivier Marchand',
            email: 'o.marchand@fruidis.fr',
            phone: '+33 4 68 34 22 10',
            addressLine: 'Zone Saint-Charles, quai 12',
            postalCode: '66000', city: 'Perpignan',
            status: 'Actif',
            services: ['transport-frigorifique', 'tournees-regulieres'],
            paymentTerms: '30 jours',
            notes: 'Températures dirigées 2 à 4 °C. Trois rotations hebdomadaires.',
            contacts: [
                { name: 'Olivier Marchand', role: 'Responsable expéditions', email: 'o.marchand@fruidis.fr', phone: '+33 6 23 56 89 01', isPrimary: true },
            ],
        },
        {
            companyName: 'BTP Girard',
            siret: '731 445 900 00033',
            contactName: 'Thomas Girard',
            email: 't.girard@btp-girard.fr',
            phone: '+33 1 69 44 78 02',
            addressLine: '3 route de Corbeil',
            postalCode: '91100', city: 'Corbeil-Essonnes',
            status: 'Prospect',
            services: ['plateaux-bras-de-grue', 'benne-aluminium-acier'],
            paymentTerms: 'À définir',
            notes: 'Devis envoyé pour livraison de matériaux en Île-de-France.',
            contacts: [
                { name: 'Thomas Girard', role: 'Gérant', email: 't.girard@btp-girard.fr', phone: '+33 6 67 90 23 45', isPrimary: true },
            ],
        },
        {
            companyName: 'Agri Loire',
            siret: '640 223 118 00021',
            contactName: 'Pierre Chevalier',
            email: 'contact@agri-loire.fr',
            phone: '+33 2 41 30 88 55',
            addressLine: 'Route de Saumur',
            postalCode: '49000', city: 'Angers',
            status: 'Prospect',
            services: ['citernes-pulverulentes'],
            notes: 'Transport d’aliments pour bétail en citerne pulvérulente.',
            contacts: [],
        },
        {
            companyName: 'Décor Simon',
            siret: '388 776 221 00018',
            contactName: 'Valérie Simon',
            email: 'v.simon@decor-simon.fr',
            phone: '+33 1 48 22 90 14',
            postalCode: '93100', city: 'Montreuil',
            status: 'Inactif',
            services: [],
            notes: 'Sans activité depuis 2025, relances sans retour.',
            contacts: [],
        },
    ]

    const clientsByName = new Map<string, string>()

    for (const def of clientDefs) {
        const { contacts, services, ...fields } = def

        const existing = await prisma.client.findFirst({
            where: { companyName: fields.companyName },
        })

        const client = existing
            ? await prisma.client.update({
                where: { id: existing.id },
                data: { ...fields, services: JSON.stringify(services) },
            })
            : await prisma.client.create({
                data: {
                    ...fields,
                    services: JSON.stringify(services),
                    accountManagerId: manager.id,
                },
            })

        clientsByName.set(client.companyName, client.id)

        // Only seed contacts the first time, so edits are never overwritten.
        if (!existing && contacts.length > 0) {
            await prisma.clientContact.createMany({
                data: contacts.map(c => ({ ...c, clientId: client.id })),
            })
        }

        console.log(`  client   ${client.companyName} (${client.status})`)
    }

    // ── Expeditions ───────────────────────────────────────────────────
    const expeditionCount = await prisma.expedition.count()
    if (expeditionCount > 0) {
        console.log(`\nLa table Expedition contient déjà ${expeditionCount} ligne(s) — expéditions ignorées.`)
        return
    }

    const id = (name: string) => clientsByName.get(name)!

    const expeditions = [
        { client: 'Transports Bernard', service: 'messagerie-nationale-internationale', status: 'Livree', days: 84, pickupCity: 'Rungis', pickupPostalCode: '94150', deliveryCity: 'Lyon', deliveryPostalCode: '69007', goods: '3 palettes EUR filmées, non gerbables', packages: 3, weight: 850, vehicle: 'Porteur 19 t hayon', price: 480 },
        { client: 'Fruidis SAS', service: 'transport-frigorifique', status: 'Livree', days: 77, pickupCity: 'Perpignan', pickupPostalCode: '66000', deliveryCity: 'Ris-Orangis', deliveryPostalCode: '91130', goods: 'Fruits et légumes frais, température dirigée', packages: 22, weight: 12400, temperature: '2 à 4 °C', vehicle: 'Semi frigorifique', price: 1850 },
        { client: 'Groupe Mercier', service: 'demenagement', status: 'Livree', days: 70, pickupCity: 'Melun', pickupPostalCode: '77000', deliveryCity: 'Évry', deliveryPostalCode: '91000', goods: 'Mobilier de bureau, 40 postes', packages: 120, weight: 4200, vehicle: '2 porteurs + 3 manutentionnaires', price: 3600 },
        { client: 'Transports Bernard', service: 'transport-urgent', status: 'Livree', days: 63, pickupCity: 'Rungis', pickupPostalCode: '94150', deliveryCity: 'Lille', deliveryPostalCode: '59000', goods: 'Pièce de rechange industrielle', packages: 1, weight: 65, vehicle: 'Véhicule léger dédié', price: 690 },
        { client: 'Fruidis SAS', service: 'transport-frigorifique', status: 'Livree', days: 56, pickupCity: 'Perpignan', pickupPostalCode: '66000', deliveryCity: 'Ris-Orangis', deliveryPostalCode: '91130', goods: 'Produits frais, rotation hebdomadaire', packages: 20, weight: 11800, temperature: '2 à 4 °C', vehicle: 'Semi frigorifique', price: 1780 },
        { client: 'Groupe Mercier', service: 'plateaux-bras-de-grue', status: 'Livree', days: 49, pickupCity: 'Melun', pickupPostalCode: '77000', deliveryCity: 'Créteil', deliveryPostalCode: '94000', goods: 'Groupe électrogène 2,4 t', packages: 1, weight: 2400, vehicle: 'Plateau + bras de grue', price: 1250 },
        // Two recent deliveries so the "ce mois" KPIs are populated on a fresh install.
        { client: 'Transports Bernard', service: 'tournees-regulieres', status: 'Livree', days: 12, pickupCity: 'Rungis', pickupPostalCode: '94150', deliveryCity: 'Orléans', deliveryPostalCode: '45000', goods: 'Tournée hebdomadaire, 8 points de livraison', packages: 46, weight: 3100, vehicle: 'Porteur 12 t', price: 920 },
        { client: 'Groupe Mercier', service: 'demenagement', status: 'Livree', days: 6, pickupCity: 'Melun', pickupPostalCode: '77000', deliveryCity: 'Fontainebleau', deliveryPostalCode: '77300', goods: 'Transfert d’agence, 15 postes', packages: 48, weight: 1900, vehicle: 'Porteur 12 t + 2 manutentionnaires', price: 1480 },
        { client: 'Fruidis SAS', service: 'transport-frigorifique', status: 'En transit', days: 5, pickupCity: 'Perpignan', pickupPostalCode: '66000', deliveryCity: 'Ris-Orangis', deliveryPostalCode: '91130', goods: 'Produits frais, rotation hebdomadaire', packages: 21, weight: 12100, temperature: '2 à 4 °C', vehicle: 'Semi frigorifique', price: 1790 },
        { client: 'Groupe Mercier', service: 'vehicules-avec-chauffeurs', status: 'Enlevee', days: 3, pickupCity: 'Melun', pickupPostalCode: '77000', deliveryCity: 'Melun', deliveryPostalCode: '77000', goods: 'Mise à disposition journée, avec manutentionnaire', packages: null, weight: null, vehicle: 'Porteur 12 t hayon', price: 620 },
        { client: 'Transports Bernard', service: 'transport-urgent', status: 'Planifiee', days: 2, pickupCity: 'Rungis', pickupPostalCode: '94150', deliveryCity: 'Nantes', deliveryPostalCode: '44000', goods: 'Colis sensible, livraison avant 8 h', packages: 2, weight: 110, vehicle: 'Véhicule léger dédié', price: 740 },
        { client: 'BTP Girard', service: 'plateaux-bras-de-grue', status: 'Demandee', days: 1, pickupCity: 'Corbeil-Essonnes', pickupPostalCode: '91100', deliveryCity: 'Massy', deliveryPostalCode: '91300', goods: 'Palettes de parpaings', packages: 12, weight: 9600, vehicle: 'Plateau + bras de grue', price: null },
        { client: 'Agri Loire', service: 'citernes-pulverulentes', status: 'Demandee', days: 1, pickupCity: 'Angers', pickupPostalCode: '49000', deliveryCity: 'Chartres', deliveryPostalCode: '28000', goods: 'Aliments pour bétail en vrac', packages: null, weight: 24000, vehicle: 'Citerne pulvérulente', price: null },
        { client: 'Transports Bernard', service: 'messagerie-nationale-internationale', status: 'Annulee', days: 30, pickupCity: 'Rungis', pickupPostalCode: '94150', deliveryCity: 'Bruxelles', deliveryPostalCode: '1000', goods: 'Envoi annulé par le client', packages: 4, weight: 1100, vehicle: 'Porteur 19 t', price: null },
    ]

    console.log(`\n  Création de ${expeditions.length} expéditions …`)

    let n = 1
    const year = new Date().getFullYear()

    for (const e of expeditions) {
        const created = daysAgo(e.days)
        await prisma.expedition.create({
            data: {
                reference: `ULS-${year}-${String(n).padStart(4, '0')}`,
                clientId: id(e.client),
                service: e.service,
                status: e.status,
                pickupCity: e.pickupCity,
                pickupPostalCode: e.pickupPostalCode,
                pickupDate: daysAgo(e.days),
                deliveryCity: e.deliveryCity,
                deliveryPostalCode: e.deliveryPostalCode,
                deliveryDate: daysAgo(Math.max(e.days - 1, 0)),
                goodsDescription: e.goods,
                packages: e.packages ?? null,
                weightKg: e.weight ?? null,
                temperature: e.temperature ?? null,
                vehicleType: e.vehicle,
                priceHt: e.price ?? null,
                createdAt: created,
                updatedAt: created,
            },
        })
        n++
    }

    console.log(`  ${expeditions.length} expéditions créées (ULS-${year}-0001 → ULS-${year}-${String(expeditions.length).padStart(4, '0')}).`)
}

main()
    .then(async () => {
        console.log('\nSeed terminé.')
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('\nSeed échoué :', e instanceof Error ? e.message : e)
        await prisma.$disconnect()
        process.exit(1)
    })
