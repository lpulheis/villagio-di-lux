import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSupabaseEmailCandidates } from '../services/supabaseAuth';
import { canAccessRoute, getNavigationItems, normalizeRoute } from './portalAccess.js';

test('morador can access public resident routes only', () => {
  assert.equal(canAccessRoute('morador', '/inicio'), true);
  assert.equal(canAccessRoute('morador', '/admin'), false);
  assert.equal(canAccessRoute('morador', '/login'), false);
  assert.equal(canAccessRoute('morador', '/avisos'), false);
});

test('admin has full access to admin routes', () => {
  assert.equal(canAccessRoute('admin', '/admin/contatos'), true);
  assert.equal(canAccessRoute('admin', '/admin'), true);
  assert.equal(canAccessRoute('admin', '/inicio'), true);
});

test('zelador and sindico can manage allowed admin pages and resident pages', () => {
  assert.equal(canAccessRoute('zelador', '/avisos'), false);
  assert.equal(canAccessRoute('sindico', '/avisos'), false);
  assert.equal(canAccessRoute('zelador', '/admin/avisos'), false);
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
  assert.ok(!getNavigationItems('admin').includes('/admin/dashboard'));
  assert.ok(!getNavigationItems('admin').includes('/admin/avisos'));
  assert.ok(getNavigationItems('morador').includes('/inicio'));
  assert.ok(!getNavigationItems('morador').includes('/admin/contatos'));
  assert.ok(!getNavigationItems('morador').includes('/avisos'));
});

test('admin routes deny avisos and keep the expected sections', () => {
  assert.equal(canAccessRoute('admin', '/admin/avisos'), false);
  assert.equal(canAccessRoute('admin', '/admin/configuracoes'), true);
  assert.equal(canAccessRoute('admin', '/admin/apps'), true);
  assert.equal(canAccessRoute('morador', '/avisos'), false);
});

test('short login identifiers resolve to the full Supabase email', () => {
  assert.deepEqual(buildSupabaseEmailCandidates('morador'), [
    'morador',
    'morador@villagiodilux.com.br',
    'morador@villagio.com',
    'morador@villagio.local',
  ]);

  assert.deepEqual(buildSupabaseEmailCandidates('Admin'), [
    'admin',
    'admin@villagiodilux.com.br',
    'admin@villagio.com',
    'admin@villagio.local',
  ]);
});
