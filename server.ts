import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { RegistrationService } from './src/services/registrationService.js';
import type { RegistrationRepository } from './src/repositories/RegistrationRepository.js';
import type { RegistrationData } from './src/types/registration.ts';

export const app = express();
const port = Number(process.env.API_PORT ?? 4178);

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

const defaultUsers: Record<string, { password: string; role: string; name: string }> = {
  admin: { password: process.env.PORTAL_ADMIN_PASSWORD ?? 'admin123', role: 'admin', name: 'Administrador' },
  sindico: { password: process.env.PORTAL_SINDICO_PASSWORD ?? 'sindico123', role: 'sindico', name: 'Síndico' },
  zelador: { password: process.env.PORTAL_ZELADOR_PASSWORD ?? 'zelador123', role: 'zelador', name: 'Zelador' },
  morador: { password: process.env.PORTAL_MORADOR_PASSWORD ?? 'morador123', role: 'morador', name: 'Morador' },
};

export const validateUserLogin = async (username: string, password: string): Promise<{ username: string; role: string; name: string } | null> => {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) return null;

  const user = defaultUsers[normalized];
  if (!user || password !== user.password) return null;

  return {
    username: normalized,
    role: user.role,
    name: user.name,
  };
};

app.use(cors());
app.use(express.json());

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

app.post('/api/portal/:resource', (req: Request<{ resource: string }>, res: Response) => {
  const resource = req.params.resource as keyof typeof portalState;
  const payload = req.body ?? [];
  const nextValue = Array.isArray(payload) ? payload : [payload];

  portalState[resource] = nextValue as never;
  return res.json({ success: true, resource, data: nextValue });
});

app.put('/api/portal/:resource/:id', (req: Request<{ resource: string; id: string }>, res: Response) => {
  const resource = req.params.resource as keyof typeof portalState;
  const array = Array.isArray(portalState[resource]) ? [...(portalState[resource] as unknown[])] : [];
  const nextValue = array.map((item) => {
    const record = item as Record<string, unknown>;
    return String(record.id) === String(req.params.id) ? { ...record, ...req.body } : record;
  });

  portalState[resource] = nextValue as never;
  return res.json({ success: true, resource, id: req.params.id, data: req.body });
});

app.delete('/api/portal/:resource/:id', (req: Request<{ resource: string; id: string }>, res: Response) => {
  const resource = req.params.resource as keyof typeof portalState;
  const array = Array.isArray(portalState[resource]) ? [...(portalState[resource] as unknown[])] : [];
  const nextValue = array.filter((item) => String((item as Record<string, unknown>).id) !== String(req.params.id));

  portalState[resource] = nextValue as never;
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
