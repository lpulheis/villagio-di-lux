import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { createClient, type User } from '@supabase/supabase-js';
import { RegistrationService } from './src/services/registrationService.js';
import type { RegistrationRepository } from './src/repositories/RegistrationRepository.js';
import type { RegistrationData } from './src/types/registration.ts';
import {
  parseResidentUnit,
  residentEmail,
  residentUnitFromEmail,
  residentUsername,
  RESIDENT_ACCOUNT_PASSWORD,
} from './src/utils/residentAccounts.js';

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
  suggestions: [],
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

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SERVICE_ROLE_KEY
  ?? '';

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const authenticateAccountManager = async (req: Request, res: Response): Promise<User | null> => {
  if (!supabaseAuth) {
    res.status(503).json({ message: 'Supabase não está configurado no servidor.' });
    return null;
  }

  const authorization = req.headers.authorization;
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken) {
    res.status(401).json({ message: 'Autenticação necessária.' });
    return null;
  }

  let data: Awaited<ReturnType<typeof supabaseAuth.auth.getUser>>['data'];
  let error: Awaited<ReturnType<typeof supabaseAuth.auth.getUser>>['error'];
  try {
    ({ data, error } = await supabaseAuth.auth.getUser(accessToken));
  } catch (authError) {
    console.error('Failed to validate account manager session:', authError);
    res.status(503).json({ message: 'Não foi possível validar sua sessão agora.' });
    return null;
  }
  if (error || !data.user) {
    res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    return null;
  }

  const role = data.user.app_metadata?.role;
  if (role !== 'admin' && role !== 'sindico') {
    res.status(403).json({ message: 'Apenas síndico e admin podem gerenciar contas.' });
    return null;
  }

  if (data.user.app_metadata?.must_change_password === true) {
    res.status(403).json({ message: 'Altere sua senha antes de gerenciar contas.' });
    return null;
  }

  return data.user;
};

const listAuthUsers = async (): Promise<User[]> => {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin não configurado.');
  }

  const users: User[] = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    users.push(...data.users);
    if (data.users.length < perPage) {
      return users;
    }
  }
};

const findResidentUser = async (unit: number): Promise<User | undefined> => {
  const email = residentEmail(unit);
  return (await listAuthUsers()).find((user) => user.email?.toLowerCase() === email);
};

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
    const role = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : 'morador';
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

app.post('/api/auth/password/change', async (req: Request, res: Response) => {
  if (!supabaseAuth || !supabaseAdmin) {
    return res.status(503).json({ message: 'Supabase Admin não está configurado no servidor.' });
  }

  const authorization = req.headers.authorization;
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken) {
    return res.status(401).json({ message: 'Autenticação necessária.' });
  }

  let data: Awaited<ReturnType<typeof supabaseAuth.auth.getUser>>['data'];
  let error: Awaited<ReturnType<typeof supabaseAuth.auth.getUser>>['error'];
  try {
    ({ data, error } = await supabaseAuth.auth.getUser(accessToken));
  } catch (authError) {
    console.error('Failed to validate session for password change:', authError);
    return res.status(503).json({ message: 'Não foi possível validar sua sessão agora.' });
  }
  if (error || !data.user) {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }

  if (data.user.app_metadata?.must_change_password !== true) {
    return res.status(400).json({ message: 'Esta conta não está aguardando a troca obrigatória de senha.' });
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'A nova senha deve ter entre 8 e 128 caracteres.' });
  }

  if (password === RESIDENT_ACCOUNT_PASSWORD) {
    return res.status(400).json({ message: 'Escolha uma senha diferente da senha temporária.' });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
    password,
    app_metadata: { ...data.user.app_metadata, must_change_password: false },
  });

  if (updateError) {
    console.error('Failed to complete required password change:', updateError.message);
    return res.status(500).json({ message: 'Não foi possível atualizar a senha. Tente novamente.' });
  }

  return res.json({ success: true });
});

app.get('/api/admin/units', async (req: Request, res: Response) => {
  const manager = await authenticateAccountManager(req, res);
  if (!manager) return;

  if (!supabaseAdmin) {
    return res.status(503).json({ message: 'Configure SUPABASE_SERVICE_ROLE_KEY no servidor.' });
  }

  try {
    const users = await listAuthUsers();
    const units = users.reduce((accounts, user) => {
      const unit = residentUnitFromEmail(user.email);
      if (unit !== null) {
        accounts.add(unit);
      }
      return accounts;
    }, new Set<number>());

    return res.json({
      units: Array.from({ length: 48 }, (_, index) => {
        const unit = index + 1;
        return { unit, username: residentUsername(unit), exists: units.has(unit) };
      }),
    });
  } catch (error) {
    console.error('Failed to list resident accounts:', error);
    return res.status(500).json({ message: 'Não foi possível carregar as contas das unidades.' });
  }
});

app.post('/api/admin/units', async (req: Request, res: Response) => {
  const manager = await authenticateAccountManager(req, res);
  if (!manager) return;

  if (!supabaseAdmin) {
    return res.status(503).json({ message: 'Configure SUPABASE_SERVICE_ROLE_KEY no servidor.' });
  }

  const unit = parseResidentUnit(req.body?.unit);
  if (unit === null) {
    return res.status(400).json({ message: 'Informe uma unidade inteira entre 1 e 48.' });
  }

  try {
    if (await findResidentUser(unit)) {
      return res.status(409).json({ message: `A conta casa${unit} já existe.` });
    }

    const username = residentUsername(unit);
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: residentEmail(unit),
      password: RESIDENT_ACCOUNT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: `Morador - Casa ${unit}`,
        unit,
      },
      app_metadata: {
        role: 'morador',
        must_change_password: true,
      },
    });

    if (error) {
      console.error(`Failed to create resident account casa${unit}:`, error.message);
      const alreadyExists = error.message.toLowerCase().includes('already')
        || error.message.toLowerCase().includes('exists');
      return res.status(alreadyExists ? 409 : 500).json({
        message: alreadyExists
          ? 'Esta conta já existe. Atualize a lista de unidades.'
          : 'Não foi possível criar a conta da unidade.',
      });
    }

    return res.status(201).json({ unit, username, temporaryPassword: RESIDENT_ACCOUNT_PASSWORD });
  } catch (error) {
    console.error(`Failed to create resident account casa${unit}:`, error);
    return res.status(500).json({ message: 'Não foi possível criar a conta da unidade.' });
  }
});

app.post('/api/admin/units/:unit/reset-password', async (req: Request<{ unit: string }>, res: Response) => {
  const manager = await authenticateAccountManager(req, res);
  if (!manager) return;

  if (!supabaseAdmin) {
    return res.status(503).json({ message: 'Configure SUPABASE_SERVICE_ROLE_KEY no servidor.' });
  }

  const unit = parseResidentUnit(req.params.unit);
  if (unit === null) {
    return res.status(400).json({ message: 'Informe uma unidade inteira entre 1 e 48.' });
  }

  try {
    const user = await findResidentUser(unit);
    if (!user || (user.app_metadata?.role !== 'morador' && user.user_metadata?.role !== 'morador')) {
      return res.status(404).json({ message: `Não foi encontrada uma conta de morador para casa${unit}.` });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: RESIDENT_ACCOUNT_PASSWORD,
      app_metadata: {
        ...user.app_metadata,
        role: 'morador',
        must_change_password: true,
      },
    });

    if (error) {
      console.error(`Failed to reset password for casa${unit}:`, error.message);
      return res.status(500).json({ message: 'Não foi possível redefinir a senha desta unidade.' });
    }

    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(user.id, 'global');
    if (signOutError) {
      console.error(`Password reset but could not revoke sessions for casa${unit}:`, signOutError.message);
      return res.status(500).json({
        message: 'A senha foi redefinida, mas não foi possível encerrar as sessões existentes. Contate o suporte.',
      });
    }

    return res.json({ unit, username: residentUsername(unit), temporaryPassword: RESIDENT_ACCOUNT_PASSWORD });
  } catch (error) {
    console.error(`Failed to reset password for casa${unit}:`, error);
    return res.status(500).json({ message: 'Não foi possível redefinir a senha desta unidade.' });
  }
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

if (process.env.NODE_ENV !== 'test' && process.env.VERCEL !== '1') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`API de cadastro e portal rodando em http://localhost:${port}`);
  });
}
