import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PortalData } from './types/portal';
import { getSheetNameForResource } from './utils/portalSheetMap';
import { mergeResourceRows, resolveUsersFromSheetRows } from '../server';

describe('Portal data model', () => {
  it('should support apps and simplified contacts', () => {
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
      contacts: [
        {
          id: '1',
          name: 'Portaria Granja Cristiana',
          function: 'Portaria',
          phone: '1133333333',
        },
      ],
      schedules: [],
      events: [
        {
          id: 'evento-1',
          date: '2026-10-06',
          event: 'Jardinagem',
          description: 'Manutenção dos jardins',
          startTime: '08:00',
          endTime: '16:00',
          status: 'ATIVO',
        },
      ],
      professionals: [],
      notices: [],
      documents: [],
      apps: [
        {
          id: 'tuya',
          name: 'Tuya',
          description: 'Automação residencial',
          androidLink: 'https://play.google.com',
          iosLink: 'https://apps.apple.com',
        },
      ],
    };

    assert.equal(data.contacts[0].function, 'Portaria');
    assert.equal(data.apps[0].name, 'Tuya');
    assert.equal(data.events[0].event, 'Jardinagem');
    assert.equal(data.events[0].description, 'Manutenção dos jardins');
    assert.equal(getSheetNameForResource('contacts'), 'CONTATOS');
    assert.equal(getSheetNameForResource('events'), 'CRONOGRAMA');
    assert.equal(getSheetNameForResource('apps'), 'APPS');
  });

  it('should keep the full contacts list when saving to the sheet', () => {
    const existingRows: string[][] = [
      ['id', 'name', 'function', 'phone'],
      ['portaria', 'Portaria Granja Cristiana', 'Portaria', '(11) 99392-5465'],
    ];

    const nextRows = mergeResourceRows('contacts', existingRows, [
      { id: 'portaria', name: 'Portaria Granja Cristiana', function: 'Portaria', phone: '(11) 99392-5465' },
      { id: 'zelador', name: 'Zelador', function: 'Zeladoria', phone: '(11) 98888-1234' },
    ]);

    assert.deepEqual(nextRows[0], ['id', 'name', 'function', 'phone']);
    assert.equal(nextRows.length, 3);
    assert.deepEqual(nextRows[2], ['zelador', 'Zelador', 'Zeladoria', '(11) 98888-1234']);
  });

  it('should remove deleted items when the final list is saved to the sheet', () => {
    const existingRows: string[][] = [
      ['id', 'name', 'function', 'phone'],
      ['portaria', 'Portaria Granja Cristiana', 'Portaria', '(11) 99392-5465'],
      ['zelador', 'Zelador', 'Zeladoria', '(11) 98888-1234'],
    ];

    const nextRows = mergeResourceRows('contacts', existingRows, [
      { id: 'portaria', name: 'Portaria Granja Cristiana', function: 'Portaria', phone: '(11) 99392-5465' },
    ]);

    assert.deepEqual(nextRows[0], ['id', 'name', 'function', 'phone']);
    assert.equal(nextRows.length, 2);
    assert.deepEqual(nextRows[1], ['portaria', 'Portaria Granja Cristiana', 'Portaria', '(11) 99392-5465']);
  });

  it('should read credentials from sheet rows', () => {
    const credentials = resolveUsersFromSheetRows([
      ['username', 'password', 'role', 'name'],
      ['admin', 'villagio-admin', 'admin', 'Administrador'],
      ['morador', 'villagio-morador', 'morador', 'Morador'],
    ]);

    assert.equal(credentials.admin.password, 'villagio-admin');
    assert.equal(credentials.morador.role, 'morador');
    assert.equal(credentials.admin.name, 'Administrador');
  });
});
