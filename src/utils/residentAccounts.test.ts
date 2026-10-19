import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseResidentUnit,
  residentEmail,
  residentUnitFromEmail,
  residentUsername,
} from './residentAccounts';

test('resident account units are limited to whole numbers from 1 to 48', () => {
  assert.equal(parseResidentUnit(1), 1);
  assert.equal(parseResidentUnit('48'), 48);
  assert.equal(parseResidentUnit(0), null);
  assert.equal(parseResidentUnit(49), null);
  assert.equal(parseResidentUnit('1.5'), null);
  assert.equal(parseResidentUnit('casa1'), null);
  assert.equal(parseResidentUnit('0x1'), null);
  assert.equal(parseResidentUnit(true), null);
});

test('resident accounts use the agreed username and email format', () => {
  assert.equal(residentUsername(38), 'casa38');
  assert.equal(residentEmail(38), 'casa38@villagiodilux.com.br');
  assert.equal(residentUnitFromEmail('casa38@villagiodilux.com.br'), 38);
  assert.equal(residentUnitFromEmail('casa49@villagiodilux.com.br'), null);
  assert.equal(residentUnitFromEmail('casa38@other.example'), null);
});
