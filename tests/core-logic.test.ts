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
