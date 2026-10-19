import { createClient, type User } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  parseResidentUnit,
  residentEmailForName,
  residentUnitFromUser,
  residentUsername,
  RESIDENT_ACCOUNT_PASSWORD,
} from '../utils/residentAccounts.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.SUPABASE_URL
  ?? '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.SUPABASE_ANON_KEY
  ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SERVICE_ROLE_KEY
  ?? '';

const supabaseAuth = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const sendApiError = (res: VercelResponse, status: number, message: string) =>
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').json({ message });

export const requireAccountManager = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<User | null> => {
  if (!supabaseAuth) {
    sendApiError(res, 503, 'Configure as credenciais públicas do Supabase no ambiente do Vercel.');
    return null;
  }

  const authorization = req.headers.authorization;
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken) {
    sendApiError(res, 401, 'Autenticação necessária.');
    return null;
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);
    if (error || !data.user) {
      sendApiError(res, 401, 'Sessão inválida ou expirada.');
      return null;
    }

    const role = data.user.app_metadata?.role;
    if (role !== 'admin' && role !== 'sindico') {
      sendApiError(res, 403, 'Apenas síndico e admin podem gerenciar contas.');
      return null;
    }
    if (data.user.app_metadata?.must_change_password === true) {
      sendApiError(res, 403, 'Altere sua senha antes de gerenciar contas.');
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('Failed to validate account manager session:', error);
    sendApiError(res, 503, 'Não foi possível validar sua sessão agora.');
    return null;
  }
};

const requireAdminClient = (res: VercelResponse) => {
  if (!supabaseAdmin) {
    sendApiError(res, 503, 'Configure SUPABASE_SERVICE_ROLE_KEY no ambiente do Vercel para habilitar o gerenciamento de contas.');
    return null;
  }
  return supabaseAdmin;
};

const listAuthUsers = async (): Promise<User[]> => {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client is unavailable.');
  }

  const users: User[] = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
};

export const listResidentAccounts = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendApiError(res, 405, 'Método não permitido.');
  }

  const manager = await requireAccountManager(req, res);
  if (!manager) return;
  if (!requireAdminClient(res)) return;

  try {
    const users = await listAuthUsers();
    const residentsByUnit = new Map<number, Array<{ id: string; name: string; email: string }>>();
    for (const user of users) {
      const unit = residentUnitFromUser(user);
      const role = user.app_metadata?.role ?? user.user_metadata?.role;
      if (unit === null || role !== 'morador' || !user.email) continue;

      const residents = residentsByUnit.get(unit) ?? [];
      residents.push({
        id: user.id,
        name: typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : user.email.split('@')[0],
        email: user.email,
      });
      residentsByUnit.set(unit, residents);
    }

    return res.status(200).json({
      units: Array.from({ length: 48 }, (_, index) => {
        const unit = index + 1;
        return {
          unit,
          residents: residentsByUnit.get(unit) ?? [],
        };
      }),
    });
  } catch (error) {
    console.error('Failed to list resident accounts:', error);
    return sendApiError(res, 500, 'Não foi possível carregar as contas. Verifique as credenciais e os logs do Supabase.');
  }
};

export const createResidentAccount = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendApiError(res, 405, 'Método não permitido.');
  }

  const manager = await requireAccountManager(req, res);
  if (!manager) return;
  const admin = requireAdminClient(res);
  if (!admin) return;

  const unit = parseResidentUnit(req.body?.unit);
  if (unit === null) {
    return sendApiError(res, 400, 'Informe uma unidade inteira entre 1 e 48.');
  }

  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
  if (fullName.length < 2 || fullName.length > 80) {
    return sendApiError(res, 400, 'Informe um nome com entre 2 e 80 caracteres.');
  }

  const email = residentEmailForName(fullName);
  if (!email) {
    return sendApiError(res, 400, 'O nome precisa conter pelo menos uma letra ou número.');
  }

  try {
    const users = await listAuthUsers();
    if (users.some((user) => user.email?.toLowerCase() === email)) {
      return sendApiError(res, 409, `Já existe uma conta com o login ${email}. Informe nome e sobrenome para diferenciar.`);
    }

    const { error } = await admin.auth.admin.createUser({
      email,
      password: RESIDENT_ACCOUNT_PASSWORD,
      email_confirm: true,
      user_metadata: { username: email.split('@')[0], full_name: fullName, unit },
      app_metadata: { role: 'morador', unit, must_change_password: true },
    });
    if (error) {
      console.error(`Failed to create resident account for unit ${unit}:`, error.message);
      const alreadyExists = /already|exists/i.test(error.message);
      return sendApiError(res, alreadyExists ? 409 : 500, alreadyExists
        ? `Já existe uma conta com o login ${email}. Informe nome e sobrenome para diferenciar.`
        : 'Não foi possível criar a conta. Verifique a configuração do Supabase Auth.');
    }

    return res.status(201).json({ unit, username: email, temporaryPassword: RESIDENT_ACCOUNT_PASSWORD });
  } catch (error) {
    console.error(`Failed to create resident account for unit ${unit}:`, error);
    return sendApiError(res, 500, 'Não foi possível criar a conta. Verifique a configuração do Supabase Auth.');
  }
};

export const resetResidentAccountPassword = async (
  req: VercelRequest,
  res: VercelResponse,
  residentUserId?: string,
) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendApiError(res, 405, 'Método não permitido.');
  }

  const manager = await requireAccountManager(req, res);
  if (!manager) return;
  const admin = requireAdminClient(res);
  if (!admin) return;

  const userId = residentUserId ?? (typeof req.query.id === 'string' ? req.query.id : '');

  try {
    let user: User | undefined;
    if (userId) {
      const { data, error: findError } = await admin.auth.admin.getUserById(userId);
      if (findError || !data.user) {
        return sendApiError(res, 404, 'A conta de morador não foi encontrada.');
      }
      user = data.user;
    } else {
      const unit = parseResidentUnit(req.query.unit);
      if (unit === null) {
        return sendApiError(res, 400, 'Informe a conta de morador que deseja redefinir.');
      }
      user = (await listAuthUsers()).find((candidate) =>
        residentUnitFromUser(candidate) === unit
        && (candidate.app_metadata?.role === 'morador' || candidate.user_metadata?.role === 'morador'),
      );
    }

    if (!user) return sendApiError(res, 404, 'A conta de morador não foi encontrada.');
    const unit = residentUnitFromUser(user);
    if (
      unit === null
      || (user.app_metadata?.role !== 'morador' && user.user_metadata?.role !== 'morador')
    ) {
      return sendApiError(res, 404, 'A conta selecionada não pertence a um morador.');
    }

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: RESIDENT_ACCOUNT_PASSWORD,
      app_metadata: { ...user.app_metadata, role: 'morador', must_change_password: true },
    });
    if (error) {
      console.error(`Failed to reset resident password for unit ${unit}:`, error.message);
      return sendApiError(res, 500, 'Não foi possível redefinir a senha desta unidade.');
    }

    const { error: signOutError } = await admin.auth.admin.signOut(user.id, 'global');
    if (signOutError) {
      console.error(`Password reset but session revocation failed for resident account ${user.id}:`, signOutError.message);
      return sendApiError(res, 500, 'Senha redefinida, mas as sessões existentes não foram encerradas. Contate o suporte.');
    }

    return res.status(200).json({
      unit,
      username: user.email ?? residentUsername(unit),
      temporaryPassword: RESIDENT_ACCOUNT_PASSWORD,
    });
  } catch (error) {
    console.error(`Failed to reset resident account ${userId || 'by unit'}:`, error);
    return sendApiError(res, 500, 'Não foi possível redefinir a senha desta unidade.');
  }
};

export const changeRequiredPassword = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendApiError(res, 405, 'Método não permitido.');
  }
  if (!supabaseAuth) {
    return sendApiError(res, 503, 'Configure as credenciais públicas do Supabase no ambiente do Vercel.');
  }
  const admin = requireAdminClient(res);
  if (!admin) return;

  const authorization = req.headers.authorization;
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken) return sendApiError(res, 401, 'Autenticação necessária.');

  try {
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);
    if (error || !data.user) return sendApiError(res, 401, 'Sessão inválida ou expirada.');
    if (data.user.app_metadata?.must_change_password !== true) {
      return sendApiError(res, 400, 'Esta conta não está aguardando a troca obrigatória de senha.');
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    if (password.length < 8 || password.length > 128) {
      return sendApiError(res, 400, 'A nova senha deve ter entre 8 e 128 caracteres.');
    }
    if (fullName.length < 2 || fullName.length > 80) {
      return sendApiError(res, 400, 'Informe um nome com entre 2 e 80 caracteres.');
    }
    if (password === RESIDENT_ACCOUNT_PASSWORD) {
      return sendApiError(res, 400, 'Escolha uma senha diferente da senha temporária.');
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
      password,
      app_metadata: { ...data.user.app_metadata, must_change_password: false },
      user_metadata: { ...data.user.user_metadata, full_name: fullName },
    });
    if (updateError) {
      console.error('Failed to complete required password change:', updateError.message);
      return sendApiError(res, 500, 'Não foi possível atualizar a senha. Tente novamente.');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to complete required password change:', error);
    return sendApiError(res, 500, 'Não foi possível atualizar a senha. Tente novamente.');
  }
};
