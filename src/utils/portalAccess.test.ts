import test from 'node:test';
import assert from 'node:assert/strict';

import { canAccessRoute, getNavigationItems, normalizeRoute } from './portalAccess.js';

test('morador can access public resident routes only', () => {
  assert.equal(canAccessRoute('morador', '/inicio'), true);
  assert.equal(canAccessRoute('morador', '/admin'), false);
  assert.equal(canAccessRoute('morador', '/login'), false);
});

test('admin has full access to admin routes', () => {
  assert.equal(canAccessRoute('admin', '/admin/contatos'), true);
  assert.equal(canAccessRoute('admin', '/inicio'), true);
});

test('zelador and sindico can manage notices and resident pages', () => {
  assert.equal(canAccessRoute('zelador', '/avisos'), true);
  assert.equal(canAccessRoute('sindico', '/avisos'), true);
  assert.equal(canAccessRoute('zelador', '/admin/avisos'), true);
  assert.equal(canAccessRoute('sindico', '/admin/contatos'), true);
  assert.equal(canAccessRoute('zelador', '/admin/configuracoes'), false);
});

test('route normalization strips hash prefix', () => {
  assert.equal(normalizeRoute('#/admin/contatos'), '/admin/contatos');
  assert.equal(normalizeRoute('/inicio'), '/inicio');
});

test('management roles expose admin navigation items while residents keep public items', () => {
  assert.ok(getNavigationItems('admin').includes('/admin/contatos'));
  assert.ok(getNavigationItems('admin').includes('/admin'));
  assert.ok(getNavigationItems('morador').includes('/inicio'));
  assert.ok(!getNavigationItems('morador').includes('/admin/contatos'));
});
