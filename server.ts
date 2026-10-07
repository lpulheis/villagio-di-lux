import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { RegistrationService } from './src/services/registrationService.js';
import type { RegistrationRepository } from './src/repositories/RegistrationRepository.js';
import type { RegistrationData } from './src/types/registration.ts';

export const app = express();
const port = Number(process.env.API_PORT ?? 4179);

const portalState: Record<string, unknown> = {
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
    { id: 'gcont', name: 'Administradora GCONT', function: 'Administradora — Villagio Di Lux', phone: '(11) 3333-0000' },
    { id: 'group-com', name: 'Administradora Group COM', function: 'Administradora — Granja Cristiana', phone: '(11) 3333-1111' },
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

class InMemoryRegistrationRepository implements RegistrationRepository {
  private readonly emails = new Set<string>();

  async findByEmail(email: string): Promise<boolean> {
    return this.emails.has(email.trim().toLowerCase());
  }

  async save(registrationData: RegistrationData): Promise<void> {
    for (const resident of registrationData.residents) {
      this.emails.add(resident.email.trim().toLowerCase());
    }
  }
}

const registrationRepository = new InMemoryRegistrationRepository();
const registrationService = new RegistrationService(registrationRepository);

const supabaseUrl = process.env.VITE_SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.SUPABASE_URL
  ?? '';

const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.SUPABASE_ANON_KEY
  ?? '';

const supabaseAuth = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const persistPortalState = async (nextState: Record<string, unknown>) => {
  if (!supabaseAuth) {
    return;
  }

  const { error } = await supabaseAuth
    .from('portal_data')
    .upsert({ slug: 'portal', payload: nextState }, { onConflict: 'slug' });

  if (error) {
    console.warn('Supabase portal persistence failed:', error.message);
  }
};

export const validateUserLogin = async (username: string, password: string): Promise<{ username: string; role: string; name: string } | null> => {
  const normalized = username.trim();
  if (!normalized || !password || !supabaseAuth) return null;

  const emailCandidates = normalized.includes('@')
    ? [normalized]
    : [
        normalized,
        `${normalized}@villagio.com`,
        `${normalized}@villagiodilux.com.br`,
        `${normalized}@villagio.local`,
      ];

  for (const email of emailCandidates) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      continue;
    }

    const user = data.user;
    const role = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : 'morador';
    const name = typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : (user.email?.split('@')[0] ?? normalized);

    return {
      username: user.email ?? normalized,
      role,
      name,
    };
  }

  return null;
};

app.use(cors());
app.use(express.json());

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
  }

  if (!supabaseAuth) {
    return res.status(503).json({
      message: 'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de logar.',
    });
  }

  const user = await validateUserLogin(username, password);
  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas para o Supabase.' });
  }

  return res.json({ user });
});

app.get('/api/portal', (_req: Request, res: Response) => {
  res.json(portalState);
});

app.get('/api/portal/:resource', (req: Request<{ resource: string }>, res: Response) => {
  const resource = req.params.resource as keyof typeof portalState;
  const value = portalState[resource];

  if (Array.isArray(value)) {
    return res.json(value);
  }

  return res.json(value ?? []);
});

app.post('/api/portal/config', async (req: Request, res: Response) => {
  portalState.config = req.body ?? portalState.config;
  await persistPortalState(portalState as Record<string, unknown>);
  return res.json({ success: true, resource: 'config', data: portalState.config });
});

app.post('/api/portal/:resource', async (req: Request<{ resource: string }>, res: Response) => {
  const resource = req.params.resource as keyof typeof portalState;
  const payload = req.body ?? [];
  const nextValue = Array.isArray(payload) ? payload : [payload];

  portalState[resource] = nextValue as never;
  await persistPortalState(portalState as Record<string, unknown>);
  return res.json({ success: true, resource, data: nextValue });
});

app.put('/api/portal/:resource/:id', async (req: Request<{ resource: string; id: string }>, res: Response) => {
  const resource = req.params.resource as keyof typeof portalState;
  const array = Array.isArray(portalState[resource]) ? [...(portalState[resource] as unknown[])] : [];
  const nextValue = array.map((item) => {
    const record = item as Record<string, unknown>;
    return String(record.id) === String(req.params.id) ? { ...record, ...req.body } : record;
  });

  portalState[resource] = nextValue as never;
  await persistPortalState(portalState as Record<string, unknown>);
  return res.json({ success: true, resource, id: req.params.id, data: req.body });
});

app.delete('/api/portal/:resource/:id', async (req: Request<{ resource: string; id: string }>, res: Response) => {
  const resource = req.params.resource as keyof typeof portalState;
  const array = Array.isArray(portalState[resource]) ? [...(portalState[resource] as unknown[])] : [];
  const nextValue = array.filter((item) => String((item as Record<string, unknown>).id) !== String(req.params.id));

  portalState[resource] = nextValue as never;
  await persistPortalState(portalState as Record<string, unknown>);
  return res.json({ success: true, resource, id: req.params.id, deleted: true });
});

app.post('/api/registrations', async (req: Request, res: Response) => {
  try {
    await registrationService.submit(req.body);
    res.status(201).json({ message: 'Cadastro registrado com sucesso.' });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Erro ao processar cadastro.',
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`API de cadastro e portal rodando em http://localhost:${port}`);
  });
}
