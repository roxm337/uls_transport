import assert from 'node:assert/strict';
import test from 'node:test';

import {
    allowedExpeditionTransitions,
    canTransitionExpedition,
} from '../lib/crm';
import {
    ExpeditionValidationError,
    parseExpeditionDate,
    parseNonNegativeNumber,
    validateExpeditionDates,
} from '../lib/server/expedition-validation';
import { resolveSections } from '../lib/sections';
import { escapeHtml } from '../lib/utils';
import { statusLabel, statusProgress } from '../lib/client-portal';
import {
    claimIssueTypeLabel,
    claimStatusLabel,
    claimTypeLabel,
    formatClaimAmount,
    isClaimStatus,
    isClaimIssueType,
    isClaimType,
} from '../lib/claims';
import { extractContact, mapCrmServices, normalizeCrmRow } from '../lib/server/crm-import';
import { claimDocumentDirectory, privateClaimDocumentResponse } from '../lib/server/claim-documents';

test('shipment status workflow allows only the next operational steps', () => {
    assert.deepEqual(allowedExpeditionTransitions('Demandee'), ['Planifiee', 'Annulee']);
    assert.equal(canTransitionExpedition('Demandee', 'Planifiee'), true);
    assert.equal(canTransitionExpedition('Demandee', 'Livree'), false);
    assert.equal(canTransitionExpedition('Livree', 'En transit'), false);
    assert.equal(canTransitionExpedition('Livree', 'Livree'), true);
});

test('shipment numeric fields reject negatives and fractional package counts', () => {
    assert.equal(parseNonNegativeNumber('12.5', 'Poids'), 12.5);
    assert.equal(parseNonNegativeNumber('', 'Poids'), null);
    assert.throws(
        () => parseNonNegativeNumber(-1, 'Poids'),
        ExpeditionValidationError
    );
    assert.throws(
        () => parseNonNegativeNumber(1.5, 'Colis', { integer: true }),
        ExpeditionValidationError
    );
});

test('shipment dates reject invalid input and reversed chronology', () => {
    const pickup = parseExpeditionDate('2026-08-03', 'Enlèvement');
    const delivery = parseExpeditionDate('2026-08-02', 'Livraison');
    assert.throws(() => validateExpeditionDates(pickup, delivery), ExpeditionValidationError);
    assert.throws(() => parseExpeditionDate('not-a-date', 'Livraison'), ExpeditionValidationError);
});

test('manager permissions preserve an explicit minimal grant without admin sections', () => {
    assert.deepEqual(
        resolveSections('MANAGER', ['/admin/users']),
        ['/admin', '/admin/settings']
    );
    assert.deepEqual(
        resolveSections('MANAGER', []),
        ['/admin', '/admin/settings']
    );
});

test('HTML escaping neutralizes markup before a preview is rendered', () => {
    assert.equal(
        escapeHtml('<img src=x onerror="alert(1)">'),
        '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    );
});

test('client portal progress follows the operational shipment workflow', () => {
    assert.equal(statusProgress('Demandee'), 20);
    assert.equal(statusProgress('En transit'), 80);
    assert.equal(statusProgress('Livree'), 100);
    assert.equal(statusProgress('Annulee'), 0);
    assert.equal(statusLabel('Planifiee'), 'Planifiée');
});

test('client claim values are validated and presented without exposing storage keys', () => {
    assert.equal(isClaimType('REMBOURSEMENT'), true);
    assert.equal(isClaimType('OTHER'), false);
    assert.equal(isClaimIssueType('RETARD'), true);
    assert.equal(isClaimIssueType('VOL'), false);
    assert.equal(isClaimStatus('INFO_REQUISE'), true);
    assert.equal(isClaimStatus('PENDING'), false);
    assert.equal(claimTypeLabel('RECLAMATION'), 'Réclamation');
    assert.equal(claimIssueTypeLabel('AVARIE'), 'Avarie');
    assert.equal(claimStatusLabel('ACCEPTEE'), 'Acceptée');
    assert.match(formatClaimAmount(125.5), /125,50/);
});

test('claim documents download PDFs, preview images, and refuse escaping paths', async () => {
    const { mkdir, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const directory = claimDocumentDirectory();
    await mkdir(directory, { recursive: true });

    const fixtures = ['test-fixture.pdf', 'test-fixture.png'];
    for (const name of fixtures) await writeFile(join(directory, name), 'fixture');

    try {
        // A PDF rendered inline would run its own JavaScript in this origin.
        const pdf = await privateClaimDocumentResponse({
            storedName: 'test-fixture.pdf',
            originalName: 'constat d’avarie.pdf',
            mimeType: 'application/pdf',
        });
        assert.match(pdf.headers.get('content-disposition') ?? '', /^attachment;/);
        assert.equal(pdf.headers.get('content-security-policy'), 'sandbox');
        assert.equal(pdf.headers.get('x-content-type-options'), 'nosniff');
        // The name survives round-tripping, accents and all.
        assert.match(pdf.headers.get('content-disposition') ?? '', /filename\*=UTF-8''/);
        assert.equal(
            decodeURIComponent((pdf.headers.get('content-disposition') ?? '').split("UTF-8''")[1]),
            'constat d’avarie.pdf',
        );

        // Images still preview in place, which is the point of the links.
        const image = await privateClaimDocumentResponse({
            storedName: 'test-fixture.png',
            originalName: 'photo.png',
            mimeType: 'image/png',
        });
        assert.match(image.headers.get('content-disposition') ?? '', /^inline;/);

        // A stored name is a bare file name; anything else never reaches the disk.
        const traversal = await privateClaimDocumentResponse({
            storedName: '../../.env.local',
            originalName: 'secrets',
            mimeType: 'application/pdf',
        });
        assert.equal(traversal.status, 400);

        const missing = await privateClaimDocumentResponse({
            storedName: 'absent.png',
            originalName: 'absent.png',
            mimeType: 'image/png',
        });
        assert.equal(missing.status, 404);
    } finally {
        for (const name of fixtures) await rm(join(directory, name), { force: true });
    }
});

test('real CRM rows normalize contacts, cities, and ULS service slugs', () => {
    assert.deepEqual(
        extractContact('DORINE BOURRON  dorine.bourron@orangina.com'),
        { name: 'Dorine Bourron', email: 'dorine.bourron@orangina.com' }
    );
    assert.deepEqual(
        mapCrmServices('Tournée régulière ; Véhicule + chauffeur; Frigorifique'),
        ['tournees-regulieres', 'vehicules-avec-chauffeurs', 'transport-frigorifique']
    );
    const client = normalizeCrmRow({
        rowNumber: 23,
        company: 'ORANGINA',
        siret: '407 512 938 00058',
        contact: 'DORINE BOURRON  dorine.bourron@orangina.com',
        city: 'LA COURNEUVE/la chapelle ',
        services: 'Tournée régulière ; Véhicule + chauffeur; Frigorifique',
        expeditionCount: 5,
        status: 'Actif',
    });
    assert.equal(client.city, 'La Courneuve / La Chapelle');
    assert.equal(client.expeditionCount, 5);
});
