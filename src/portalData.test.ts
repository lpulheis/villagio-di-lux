import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import type { PortalData } from './types/portal';

let validateUserLogin: typeof import('../server').validateUserLogin;

before(async () => {
  process.env.NODE_ENV = 'test';
  ({ validateUserLogin } = await import('../server'));
});

describe('Portal data model', () => {
  it('should expose a valid default portal config', () => {
    const data: PortalData = {
      config: {
        condominiumName: 'VILLAGIO DI LUX',
        cnpj: '59.271.694/0001-44',
        portariaAddress: 'Rua Chimangos, 70',
        portariaCep: '06740-572',
        internalAddress: 'Rua Uruguaiana, 69',
        internalCep: '06740-560',
        externalAddress: 'Estrada Ribeirão das Lages, 1270',
        externalCep: '06740-000',
        presentation: 'Portal',
        phone: '',
        whatsapp: '',
        email: '',
        welcomeMessage: '',
        highlightNotice: '',
        usefulLinks: [],
        generalInfo: '',
      },
      contacts: [],
      schedules: [],
      events: [],
      professionals: [],
      notices: [],
      documents: [],
      apps: [],
    };

    assert.equal(data.config.condominiumName, 'VILLAGIO DI LUX');
    assert.deepEqual(data.contacts, []);
    assert.deepEqual(data.apps, []);
  });

  it('should reject legacy fallback credentials when Supabase is the source of truth', async () => {
    const user = await validateUserLogin('admin', 'admin123');

    assert.equal(user, null);
  });

  it('should reject invalid fallback credentials', async () => {
    const user = await validateUserLogin('admin', 'wrong-password');
    assert.equal(user, null);
  });
});
