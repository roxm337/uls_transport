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
