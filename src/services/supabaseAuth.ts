import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { residentUnitFromEmail } from '../utils/residentAccounts';
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
  const username = typeof user.user_metadata?.username === 'string'
    ? user.user_metadata.username
    : (user.email ?? 'usuario').replace(/@.*$/, '');
  const name = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : username;
  const unit = residentUnitFromEmail(user.email);

  return {
    username,
    role: normalizeRole(user.app_metadata?.role),
    name,
    mustChangePassword: user.app_metadata?.must_change_password === true,
    unit: unit ?? undefined,
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
    normalized,
    `${normalized}@villagiodilux.com.br`,
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

export const changeInitialPassword = async (password: string): Promise<SupabaseSession> => {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { data: current, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !current.session) {
    throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  }

  const response = await fetch('/api/auth/password/change', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${current.session.access_token}`,
    },
    body: JSON.stringify({ password }),
  });
  const result = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    throw new Error(result.message ?? 'Não foi possível atualizar sua senha.');
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user || data.user.app_metadata?.must_change_password === true) {
    throw new Error('A senha foi salva, mas não foi possível confirmar a atualização. Entre novamente.');
  }

  return getPortalSession(data.user);
};
