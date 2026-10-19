import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { residentUnitFromUser } from '../utils/residentAccounts';
import type { PortalRole } from '../utils/portalAccess';
import type { User } from '@supabase/supabase-js';

export type SupabaseSession = {
  username: string;
  role: PortalRole;
  name: string;
  mustChangePassword: boolean;
  unit?: number;
};

const normalizeRole = (role: unknown): PortalRole => {
  if (role === 'admin' || role === 'sindico' || role === 'zelador' || role === 'morador') {
    return role;
  }

  return 'morador';
};

export const getPortalSession = (user: User): SupabaseSession => {
  const username = user.email
    ?? (typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : 'usuario');
  const name = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : username.replace(/@.*$/, '');

  return {
    username,
    role: normalizeRole(user.app_metadata?.role),
    name,
    mustChangePassword: user.app_metadata?.must_change_password === true,
    unit: residentUnitFromUser(user) ?? undefined,
  };
};

export const buildSupabaseEmailCandidates = (identifier: string): string[] => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.includes('@')) {
    return [trimmed];
  }

  const normalized = trimmed.toLowerCase();
  return Array.from(new Set([
    `${normalized}@villagiodilux.com.br`,
    normalized,
    `${normalized}@villagio.com`,
    `${normalized}@villagio.local`,
  ]));
};

export const signInWithSupabase = async (credentials: { username: string; password: string }): Promise<SupabaseSession> => {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  const identifier = credentials.username.trim();
  const password = credentials.password;
  const emailCandidates = buildSupabaseEmailCandidates(identifier);

  let lastError: Error | null = null;

  for (const email of emailCandidates) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!error && data.user) {
      return getPortalSession(data.user);
    }

    lastError = new Error(error?.message ?? 'Credenciais inválidas.');
  }

  throw lastError ?? new Error('Credenciais inválidas.');
};

export const changeInitialPassword = async (password: string, fullName: string): Promise<SupabaseSession> => {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { data: current, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !current.session?.user.email) {
    throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  }

  const response = await fetch('/api/auth/password/change', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${current.session.access_token}`,
    },
    body: JSON.stringify({ password, fullName }),
  });
  let result: { message?: string };
  try {
    result = await response.json() as { message?: string };
  } catch {
    throw new Error(`A API de troca de senha retornou uma resposta inválida (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result.message ?? 'Não foi possível atualizar sua senha.');
  }

  await supabase.auth.signOut({ scope: 'local' });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: current.session.user.email,
    password,
  });
  if (error || !data.user || data.user.app_metadata?.must_change_password === true) {
    throw new Error('A senha foi atualizada. Entre novamente usando sua nova senha.');
  }

  return getPortalSession(data.user);
};

export const updateResidentProfileName = async (fullName: string): Promise<SupabaseSession> => {
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const normalizedName = fullName.trim();
  if (normalizedName.length < 2 || normalizedName.length > 80) {
    throw new Error('O nome deve ter entre 2 e 80 caracteres.');
  }

  const { data, error } = await supabase.auth.updateUser({
    data: { full_name: normalizedName },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Não foi possível atualizar seu nome.');
  }

  return getPortalSession(data.user);
};
