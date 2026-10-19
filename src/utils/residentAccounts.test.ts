import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseResidentUnit,
  residentEmail,
  residentEmailForName,
  residentUnitFromEmail,
  residentUnitFromUser,
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

test('resident email is generated from a normalized name and fixed domain', () => {
  assert.equal(residentEmailForName('Mário da Silva'), 'mario.da.silva@villagiodilux.com.br');
  assert.equal(residentEmailForName('Maria'), 'maria@villagiodilux.com.br');
  assert.equal(residentEmailForName('---'), null);
});

test('resident unit is read from protected or legacy metadata before legacy email', () => {
  assert.equal(residentUnitFromUser({ app_metadata: { unit: 2 } }), 2);
  assert.equal(residentUnitFromUser({ user_metadata: { unit: '3' } }), 3);
  assert.equal(residentUnitFromUser({ email: 'casa4@villagiodilux.com.br' }), 4);
  assert.equal(residentUnitFromUser({ email: 'maria@villagiodilux.com.br' }), null);
});
