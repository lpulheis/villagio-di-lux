import 'dotenv/config';

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import Papa from 'papaparse';
import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { RegistrationService } from './src/services/registrationService.js';
import { CSVRepository } from './src/repositories/CSVRepository.js';
import { GoogleSheetsRepository } from './src/repositories/GoogleSheetsRepository.js';
import { getSheetNameForResource } from './src/utils/portalSheetMap.js';

export const app = express();
const port = Number(process.env.API_PORT ?? 4178);

const hasSupabaseAuthConfig = Boolean(
  (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  && (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
);

app.use(cors());
app.use(express.json());

const useSheets = process.env.USE_GOOGLE_SHEETS === 'true';
console.log('[server] startup env', {
  useSheets,
  hasGoogleServiceAccountJson: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  hasGoogleServiceAccountKeyFile: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE),
  googleSheetsId: process.env.GOOGLE_SHEETS_ID ?? null,
  apiPort: port,
  cwd: process.cwd(),
});

const registrationRepository = useSheets ? new GoogleSheetsRepository() : new CSVRepository();
const registrationService = new RegistrationService(registrationRepository);
const PORTAL_FALLBACK_CSV = path.resolve(process.cwd(), 'portal-fallback.csv');

const readPortalFallbackCsv = async (): Promise<Record<string, unknown> | null> => {
  try {
    const raw = await fs.readFile(PORTAL_FALLBACK_CSV, 'utf-8');
    const parsed = Papa.parse<{ resource: string; content: string }>(raw, {
      header: true,
      skipEmptyLines: true,
    }).data;

    const data: Record<string, unknown> = {};

    for (const row of parsed) {
      if (!row.resource || !row.content) continue;
      try {
        data[row.resource] = JSON.parse(row.content);
      } catch {
        data[row.resource] = row.content;
      }
    }

    return Object.keys(data).length ? data : null;
  } catch {
    return null;
  }
};

const writePortalFallbackCsv = async (data: Record<string, unknown>) => {
  const rows = Object.entries(data).map(([resource, value]) => ({
    resource,
    content: JSON.stringify(value),
  }));

  await fs.writeFile(PORTAL_FALLBACK_CSV, Papa.unparse(rows), 'utf-8');
};

const toSheetRows = (resource: string, payload: unknown): string[][] => {
  const items = Array.isArray(payload) ? payload : [payload];

  if (!items.length) {
    return [];
  }

  const firstItem = items[0] as Record<string, unknown>;
  const headers = Object.keys(firstItem ?? {});

  return [
    headers,
    ...items.map((item) => headers.map((header) => String((item as Record<string, unknown>)[header] ?? ''))),
  ];
};

const parseSheetRows = (rows: string[][]): Record<string, unknown>[] => {
  if (!rows.length) {
    return [];
  }

  const [header, ...dataRows] = rows;
  return dataRows.map((row) => Object.fromEntries(header.map((key, index) => [key.trim(), row[index] ?? ''])));
};

export const mergeResourceRows = (resource: string, existingRows: string[][], payload: unknown): string[][] => {
  if (resource === 'config') {
    const item = Array.isArray(payload) ? payload[0] : payload;
    const config = sanitizePortalItem('config', (item as Record<string, unknown>) ?? fallbackPortalData.config);
    const configHeaders = [
      'condominiumName',
      'cnpj',
      'portariaAddress',
      'portariaCep',
      'internalAddress',
      'internalCep',
      'externalAddress',
      'externalCep',
      'presentation',
      'phone',
      'whatsapp',
      'email',
      'welcomeMessage',
      'highlightNotice',
      'generalInfo',
    ];

    return [
      configHeaders,
      configHeaders.map((header) => String((config as Record<string, unknown>)[header] ?? '')),
    ];
  }

  const normalizedItems = (Array.isArray(payload) ? payload : [payload])
    .filter((item) => item !== null && item !== undefined)
    .map((item) => sanitizePortalItem(resource, item as Record<string, unknown>));

  if (!normalizedItems.length) {
    return [];
  }

  if (Array.isArray(payload)) {
    const finalItems = normalizedItems.map((item) => item as Record<string, unknown>);
    return toSheetRows(resource, finalItems);
  }

  const currentItems = parseSheetRows(existingRows);
  const mergedMap = new Map<string, Record<string, unknown>>();
  const order: string[] = [];

  currentItems.forEach((item, index) => {
    const itemId = String((item as Record<string, unknown>).id ?? `existing-${index}`);
    mergedMap.set(itemId, item as Record<string, unknown>);
    order.push(itemId);
  });

  normalizedItems.forEach((item) => {
    const itemRecord = item as Record<string, unknown>;
    const itemId = String(itemRecord.id ?? `new-${crypto.randomUUID()}`);

    if (!mergedMap.has(itemId)) {
      order.push(itemId);
    }

    mergedMap.set(itemId, { ...(mergedMap.get(itemId) ?? {}), ...itemRecord });
  });

  const finalItems = order
    .map((itemId) => mergedMap.get(itemId))
    .filter((item): item is Record<string, unknown> => Boolean(item));

  return toSheetRows(resource, finalItems);
};

const appIconMap: Record<string, string> = {
  tuya: '/apps/tuya.png',
  'group-com': '/apps/group-com.png',
  condominio: '/apps/condominio.png',
  condfy: '/apps/condfy.png',
};

const fallbackPortalData = {
  config: {
    condominiumName: 'VILLAGIO DI LUX',
    cnpj: '59.271.694/0001-44',
    portariaAddress: 'Rua Chimangos, 70',
    portariaCep: '06740-572',
    internalAddress: 'Rua Uruguaiana, 69',
    internalCep: '06740-560',
    externalAddress: 'Estrada Ribeirão das Lages, 1270',
    externalCep: '06740-000',
    presentation: 'Portal oficial do condomínio para informações, horários e contatos.',
    phone: '(11) 3333-0000',
    whatsapp: '(11) 99999-0000',
    email: 'contato@villagiodilux.com.br',
    welcomeMessage: 'Bem-vindo ao Portal do Residencial Granja Cristiana.',
    highlightNotice: 'Informações e comunicados importantes do residencial.',
    usefulLinks: ['https://www.google.com', 'https://www.example.com'],
    generalInfo: 'Informações institucionais e procedimentos do condomínio.',
  },
  contacts: [
    { id: 'gcont', name: 'Administradora GCONT', role: 'Administradora — Villagio Di Lux', phone: '(11) 3333-0000', whatsapp: '11999999999' },
    { id: 'group-com', name: 'Administradora Group COM', role: 'Administradora — Granja Cristiana', phone: '(11) 3333-1111', whatsapp: '11999999998' },
    { id: 'rui-oliveira', name: 'Rui Oliveira', role: 'Síndico', phone: '(11) 3333-2222', whatsapp: '11999999997' },
    { id: 'nivea', name: 'Nivea', role: 'Zeladora', phone: '(11) 3333-3333', whatsapp: '11999999996' },
    { id: 'msiao', name: 'MSiao', role: 'Manutenção Portões, Câmeras e Cerca Elétrica', phone: '(11) 3333-4444', whatsapp: '11999999995' },
    { id: 'jardineiro', name: 'Jardineiro', role: 'Jardineiro', phone: '(11) 3333-5555', whatsapp: '11999999994' },
    { id: 'piscineiro', name: 'Piscineiro', role: 'Piscineiro', phone: '(11) 3333-6666', whatsapp: '11999999993' },
    { id: 'portoes-cameras', name: 'Portões e Câmeras', role: 'Suporte — Portões e Câmeras', phone: '(11) 3333-7777', whatsapp: '11999999992' },
    { id: 'portaria', name: 'Portaria Granja Cristiana', role: 'Portaria', phone: '(11) 3333-8888', whatsapp: '11999999991' },
    { id: 'encomendas', name: 'Encomendas Granja Cristiana', role: 'Encomendas', phone: '(11) 3333-9999', whatsapp: '11999999990' },
    { id: 'ronda', name: 'Ronda Granja Cristiana', role: 'Ronda', phone: '(11) 3333-0001', whatsapp: '11999999989' },
  ],
  schedules: [
    {
      id: 's1',
      category: 'Obras, reformas e mudanças',
      title: 'Obras, reformas e mudanças',
      dayType: 'dias-da-semana',
      day: 'Segunda a sexta',
      startTime: '08:00',
      endTime: '19:00',
      allowed: 'SIM',
      description: 'Horário permitido para obras e reformas',
      observation: 'Horário permitido para obras e reformas',
      status: 'ATIVO',
    },
    {
      id: 's2',
      category: 'Obras, reformas e mudanças',
      title: 'Obras, reformas e mudanças',
      dayType: 'sabado',
      day: 'Sábado',
      startTime: '09:00',
      endTime: '14:00',
      allowed: 'SIM',
      description: 'Horário permitido para obras e reformas',
      observation: 'Horário permitido para obras e reformas',
      status: 'ATIVO',
    },
    {
      id: 's3',
      category: 'Obras, reformas e mudanças',
      title: 'Obras, reformas e mudanças',
      dayType: 'domingo-e-feriados',
      day: 'Domingo e feriados',
      startTime: '-',
      endTime: '-',
      allowed: 'NÃO',
      description: 'Não permitido',
      observation: 'Não permitido',
      status: 'ATIVO',
    },
  ],
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
  professionals: [
    {
      id: 'prof-1',
      name: 'Jardineiro',
      service: 'Jardinagem',
      company: 'Villagio Di Lux',
      phone: '(11) 3333-2222',
      whatsapp: '(11) 99999-0003',
      observation: 'Cuidado com áreas verdes',
      status: 'ATIVO',
    },
  ],
  notices: [
    {
      id: 'aviso-1',
      title: 'Aviso importante',
      description: 'Acompanhamento da piscina será realizado na próxima semana.',
      category: 'Geral',
      date: '2026-10-06',
      priority: 'ALTA',
      image: '',
      link: '',
      status: 'ATIVO',
    },
  ],
  documents: [
    {
      id: 'doc-1',
      name: 'Regimento interno',
      category: 'Documentos',
      description: 'Normas e procedimentos do condomínio',
      date: '2026-10-06',
      link: '#',
      status: 'ATIVO',
    },
  ],
  apps: [
    {
      id: 'tuya',
      name: 'Tuya',
      description: 'Automação dos portões do condomínio.',
      androidLink: 'https://play.google.com/store/apps/details?id=com.tuya.smart&pcampaignid=web_share',
      iosLink: 'https://apps.apple.com/br/app/tuya-smart-life-smart-living/id1034649547',
      icon: appIconMap.tuya,
    },
    {
      id: 'group-com',
      name: 'Group COM',
      description: 'Aplicativo da Administradora Granja Cristiana.',
      androidLink: 'https://play.google.com/store/apps/details?id=br.com.comunidadesmobile_1&pcampaignid=web_share',
      iosLink: 'https://apps.apple.com/br/app/group-com/id999528459',
      icon: appIconMap['group-com'],
    },
    {
      id: 'condominio',
      name: 'Condomínio',
      description: 'Aplicativo da Administradora Villagio Di Lux.',
      androidLink: 'https://play.google.com/store/apps/details?id=com.condor.superlogica&pcampaignid=web_share',
      iosLink: 'https://apps.apple.com/br/app/condom%C3%ADnio-%C3%A1rea-do-cond%C3%B4mino/id1160849001',
      icon: appIconMap.condominio,
    },
    {
      id: 'condfy',
      name: 'Condfy',
      description: 'Gestão de encomendas e visitantes da Granja Cristiana.',
      androidLink: 'https://play.google.com/store/apps/details?id=br.com.condfy&pcampaignid=web_share',
      iosLink: 'https://apps.apple.com/br/app/condfy/id1459875612',
      icon: appIconMap.condfy,
    },
  ],
};

const sanitizePortalItem = (resource: string, item: Record<string, unknown>): Record<string, unknown> => {
  if (resource === 'contacts') {
    return {
      id: String(item.id ?? crypto.randomUUID()),
      name: String(item.name ?? ''),
      function: String(item.function ?? item.funcao ?? item.role ?? item.category ?? 'Contato'),
      phone: String(item.phone ?? ''),
    };
  }

  if (resource === 'schedules') {
    const dayLabel = String(item.day ?? 'Segunda a sexta');
    const allowedValue = String(item.allowed ?? 'SIM');
    const dayType = String(item.dayType ?? (
      /sabado|sábado/i.test(dayLabel)
        ? 'sabado'
        : /domingo|feriado/i.test(dayLabel)
          ? 'domingo-e-feriados'
          : 'dias-da-semana'
    ));

    return {
      id: String(item.id ?? crypto.randomUUID()),
      category: String(item.category ?? 'Obras, reformas e mudanças'),
      title: String(item.title ?? 'Obras, reformas e mudanças'),
      dayType,
      day: dayLabel,
      startTime: String(item.startTime ?? '08:00'),
      endTime: String(item.endTime ?? '19:00'),
      allowed: allowedValue,
      description: String(item.description ?? (allowedValue === 'SIM' ? 'Horário permitido' : 'Não permitido')),
      observation: String(item.observation ?? (allowedValue === 'SIM' ? 'Horário permitido' : 'Não permitido')),
      status: String(item.status ?? 'ATIVO'),
    };
  }

  if (resource === 'events') {
    const eventName = String(item.event ?? item.service ?? 'Evento');
    const description = String(item.description ?? item.observation ?? item.service ?? 'Descrição');

    return {
      id: String(item.id ?? crypto.randomUUID()),
      date: String(item.date ?? ''),
      event: eventName,
      description,
      startTime: String(item.startTime ?? ''),
      endTime: String(item.endTime ?? ''),
      status: String(item.status ?? 'ATIVO'),
      ...(typeof item.service === 'string' ? { service: item.service } : {}),
      ...(typeof item.observation === 'string' ? { observation: item.observation } : {}),
      ...(typeof item.professional === 'string' ? { professional: item.professional } : {}),
    };
  }

  if (resource === 'apps') {
    const fallbackIcon = typeof item.id === 'string' ? appIconMap[String(item.id).toLowerCase()] : undefined;
    return {
      id: String(item.id ?? crypto.randomUUID()),
      name: String(item.name ?? ''),
      description: String(item.description ?? ''),
      androidLink: String(item.androidLink ?? ''),
      iosLink: String(item.iosLink ?? ''),
      icon: typeof item.icon === 'string' && item.icon ? item.icon : fallbackIcon,
    };
  }

  return { ...item };
};

const getPortalFallback = (resource: string) => {
  const map: Record<string, unknown> = fallbackPortalData;
  return map[resource] ?? fallbackPortalData.config;
};

export const resolveUsersFromSheetRows = (rows: string[][]): Record<string, { password: string; role: string; name: string }> => {
  const result: Record<string, { password: string; role: string; name: string }> = {};

  if (!rows.length) {
    return result;
  }

  const [header, ...dataRows] = rows;
  const headerMap = header.map((key) => key.trim().toLowerCase());
  const usernameIndex = headerMap.findIndex((key) => ['username', 'user', 'login', 'usuario', 'nomeusuario'].includes(key));
  const passwordIndex = headerMap.findIndex((key) => ['password', 'senha', 'pass'].includes(key));
  const roleIndex = headerMap.findIndex((key) => ['role', 'perfil', 'cargo', 'papel'].includes(key));
  const nameIndex = headerMap.findIndex((key) => ['name', 'nome', 'displayname'].includes(key));

  if (usernameIndex < 0 || passwordIndex < 0) {
    return result;
  }

  for (const row of dataRows) {
    const username = String(row[usernameIndex] ?? '').trim().toLowerCase();
    const password = String(row[passwordIndex] ?? '').trim();
    const role = String(row[roleIndex >= 0 ? roleIndex : usernameIndex] ?? username).trim().toLowerCase();
    const name = String(row[nameIndex >= 0 ? nameIndex : usernameIndex] ?? username).trim();

    if (!username || !password) {
      continue;
    }

    result[username] = { password, role, name };
  }

  return result;
};

const getDisplayNameForRole = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'sindico':
      return 'Síndico';
    case 'zelador':
      return 'Zelador';
    default:
      return 'Morador';
  }
};

const findUserInSheet = async (username: string): Promise<{ password: string; role: string; name: string } | null> => {
  const normalized = username.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (!useSheets) {
    return null;
  }

  try {
    const repository = new GoogleSheetsRepository();
    const rows = await repository.readSheet(getSheetNameForResource('users'));
    const sheetUsers = resolveUsersFromSheetRows(rows);
    const found = sheetUsers[normalized];

    if (found) {
      return {
        ...found,
        role: found.role.trim().toLowerCase() || normalized,
        name: found.name || getDisplayNameForRole(found.role.trim().toLowerCase() || normalized),
      };
    }
  } catch (error) {
    console.error('[auth] sheet user lookup failed', error);
  }

  return null;
};

const resolvePassword = async (username: string): Promise<string> => {
  const normalized = username.trim().toLowerCase();

  const envKeyMap: Record<string, string> = {
    admin: 'PORTAL_ADMIN_PASSWORD',
    sindico: 'PORTAL_SINDICO_PASSWORD',
    zelador: 'PORTAL_ZELADOR_PASSWORD',
    morador: 'PORTAL_MORADOR_PASSWORD',
  };

  const key = envKeyMap[normalized] ?? 'PORTAL_MORADOR_PASSWORD';
  const defaults: Record<string, string> = {
    admin: 'villagio-admin',
    sindico: 'villagio-sindico',
    zelador: 'villagio-zelador',
    morador: 'villagio-morador',
  };

  return process.env[key] ?? defaults[normalized] ?? defaults.morador;
};

export const validateUserLogin = async (username: string, password: string): Promise<{ username: string; role: string; name: string } | null> => {
  const normalized = username.trim().toLowerCase();

  if (!normalized || !password) {
    return null;
  }

  if (hasSupabaseAuthConfig) {
    return null;
  }

  const sheetUser = await findUserInSheet(normalized);
  if (sheetUser && password === sheetUser.password) {
    return {
      username: normalized,
      role: sheetUser.role,
      name: sheetUser.name || getDisplayNameForRole(sheetUser.role),
    };
  }

  const validUsernames = ['morador', 'zelador', 'sindico', 'admin'] as const;

  for (const role of validUsernames) {
    if (normalized === role && password === await resolvePassword(role)) {
      return {
        username: normalized,
        role,
        name: getDisplayNameForRole(role),
      };
    }
  }

  return null;
};

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
  }

  const user = await validateUserLogin(username, password);

  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  return res.json({ user });
});

app.get('/api/portal', async (_req: Request, res: Response) => {
  try {
    if (useSheets) {
      const repository = new GoogleSheetsRepository();

      const transform = (resource: string, rows: string[][]): Record<string, unknown>[] => {
        if (!rows.length) return Array.isArray(getPortalFallback(resource)) ? (getPortalFallback(resource) as Record<string, unknown>[]) : [];
        const [header, ...dataRows] = rows;
        return dataRows.map((row) => Object.fromEntries(header.map((key, index) => [key.trim(), row[index] ?? ''])));
      };

      const sheetsMap: Record<string, string[][]> = {
        config: await repository.readSheet(getSheetNameForResource('config')),
        contacts: await repository.readSheet(getSheetNameForResource('contacts')),
        schedules: await repository.readSheet(getSheetNameForResource('schedules')),
        events: await repository.readSheet(getSheetNameForResource('events')),
        professionals: await repository.readSheet(getSheetNameForResource('professionals')),
        notices: await repository.readSheet(getSheetNameForResource('notices')),
        documents: await repository.readSheet(getSheetNameForResource('documents')),
        apps: await repository.readSheet(getSheetNameForResource('apps')),
      };

      return res.json({
        config: transform('config', sheetsMap.config)[0] ?? fallbackPortalData.config,
        contacts: transform('contacts', sheetsMap.contacts).map((item) => sanitizePortalItem('contacts', item as Record<string, unknown>)),
        schedules: transform('schedules', sheetsMap.schedules),
        events: transform('events', sheetsMap.events).map((item) => sanitizePortalItem('events', item as Record<string, unknown>)),
        professionals: transform('professionals', sheetsMap.professionals),
        notices: transform('notices', sheetsMap.notices),
        documents: transform('documents', sheetsMap.documents),
        apps: transform('apps', sheetsMap.apps ?? []).map((item) => sanitizePortalItem('apps', item as Record<string, unknown>)),
      });
    }

    const fallbackData = (await readPortalFallbackCsv()) ?? fallbackPortalData;
    const normalizedFallbackData = {
      ...fallbackData,
      events: Array.isArray(fallbackData.events)
        ? fallbackData.events.map((item) => sanitizePortalItem('events', item as Record<string, unknown>))
        : fallbackPortalData.events,
    };
    return res.json(normalizedFallbackData);
  } catch {
    const fallbackData = (await readPortalFallbackCsv()) ?? fallbackPortalData;
    const normalizedFallbackData = {
      ...fallbackData,
      events: Array.isArray(fallbackData.events)
        ? fallbackData.events.map((item) => sanitizePortalItem('events', item as Record<string, unknown>))
        : fallbackPortalData.events,
    };
    return res.json(normalizedFallbackData);
  }
});

app.get('/api/portal/:resource', async (req: Request<{ resource: string }>, res: Response) => {
  const resource = req.params.resource;

  try {
    const repository = new GoogleSheetsRepository();
    const rows = await repository.readSheet(getSheetNameForResource(resource));

    if (!rows.length) {
      return res.json(getPortalFallback(resource));
    }

    const [header, ...dataRows] = rows;
    const parsed = dataRows.map((row) => Object.fromEntries(header.map((key, index) => [key.trim(), row[index] ?? ''])));
    const sanitized = resource === 'contacts'
      ? parsed.map((item) => sanitizePortalItem('contacts', item as Record<string, unknown>))
      : resource === 'events'
        ? parsed.map((item) => sanitizePortalItem('events', item as Record<string, unknown>))
        : resource === 'apps'
          ? parsed.map((item) => sanitizePortalItem('apps', item as Record<string, unknown>))
          : parsed;
    return res.json(sanitized);
  } catch {
    return res.json(getPortalFallback(resource));
  }
});

app.post('/api/portal/:resource', async (req: Request<{ resource: string }>, res: Response) => {
  const resource = req.params.resource;
  const payload = req.body ?? {};

  try {
    const localData: Record<string, unknown> = (await readPortalFallbackCsv()) ?? (fallbackPortalData as Record<string, unknown>);
    const nextResourceData = Array.isArray(payload) ? payload : [payload];
    const normalizedPayload = Array.isArray(payload)
      ? payload.map((item) => sanitizePortalItem(resource, item as Record<string, unknown>))
      : sanitizePortalItem(resource, payload as Record<string, unknown>);
    const nextData = { ...localData, [resource]: normalizedPayload };

    if (useSheets) {
      try {
        const repository = new GoogleSheetsRepository();
        const sheetName = getSheetNameForResource(resource);
        const existingRows = await repository.readSheet(sheetName);
        const mergedRows = mergeResourceRows(resource, existingRows, nextResourceData);

        if (resource === 'config') {
          const configHeaders = [
            'condominiumName',
            'cnpj',
            'portariaAddress',
            'portariaCep',
            'internalAddress',
            'internalCep',
            'externalAddress',
            'externalCep',
            'presentation',
            'phone',
            'whatsapp',
            'email',
            'welcomeMessage',
            'highlightNotice',
            'generalInfo',
          ];

          await repository.writeSheet('CONFIG', [
            configHeaders,
            configHeaders.map((header) => String((payload as Record<string, unknown>)[header] ?? '')),
          ]);
        } else {
          await repository.writeSheet(sheetName, mergedRows);
        }
      } catch {
        // Falls back to the local CSV store when Google Sheets is unavailable.
      }
    }

    await writePortalFallbackCsv(nextData);
    return res.json({ success: true, resource, data: normalizedPayload });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Erro ao salvar dados do portal.',
    });
  }
});

app.put('/api/portal/:resource/:id', async (req: Request<{ resource: string; id: string }>, res: Response) => {
  const resource = req.params.resource;
  const payload = req.body ?? {};
  const currentData: Record<string, unknown> = (await readPortalFallbackCsv()) ?? (fallbackPortalData as Record<string, unknown>);
  const items = Array.isArray(currentData[resource]) ? [...(currentData[resource] as unknown[])] : [];
  const nextItems = items.map((item) => (String((item as Record<string, unknown>).id) === String(req.params.id) ? { ...(item as Record<string, unknown>), ...payload } : item));

  const nextData = { ...currentData, [resource]: nextItems };

  if (useSheets && resource !== 'config') {
    try {
      const repository = new GoogleSheetsRepository();
      const currentRows = await repository.readSheet(getSheetNameForResource(resource));
      await repository.writeSheet(getSheetNameForResource(resource), mergeResourceRows(resource, currentRows, nextItems));
    } catch {
      // ignore and keep csv fallback behavior
    }
  }

  await writePortalFallbackCsv(nextData);
  return res.json({ success: true, resource, id: req.params.id, data: payload });
});

app.delete('/api/portal/:resource/:id', async (req: Request<{ resource: string; id: string }>, res: Response) => {
  const resource = req.params.resource;
  const currentData: Record<string, unknown> = (await readPortalFallbackCsv()) ?? (fallbackPortalData as Record<string, unknown>);
  const items = Array.isArray(currentData[resource]) ? [...(currentData[resource] as unknown[])] : [];
  const nextItems = items.filter((item) => String((item as Record<string, unknown>).id) !== String(req.params.id));

  const nextData = { ...currentData, [resource]: nextItems };

  if (useSheets && resource !== 'config') {
    try {
      const repository = new GoogleSheetsRepository();
      const currentRows = await repository.readSheet(getSheetNameForResource(resource));
      await repository.writeSheet(getSheetNameForResource(resource), mergeResourceRows(resource, currentRows, nextItems));
    } catch {
      // ignore and keep csv fallback behavior
    }
  }

  await writePortalFallbackCsv(nextData);
  return res.json({ success: true, resource, id: req.params.id, deleted: true });
});

app.post('/api/registrations', async (req: Request, res: Response) => {
  try {
    await registrationService.submit(req.body);
    res.status(201).json({ message: 'Cadastro registrado com sucesso.' });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

const isDirectServerEntry = typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (process.env.NODE_ENV !== 'test' && isDirectServerEntry) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`API de cadastro e portal rodando em http://localhost:${port}`);
  });
}