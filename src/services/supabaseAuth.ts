import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { PortalRole } from '../utils/portalAccess';

export type SupabaseSession = {
  username: string;
  role: PortalRole;
  name: string;
};

const normalizeRole = (role: string | undefined): PortalRole => {
  if (role === 'admin' || role === 'sindico' || role === 'zelador' || role === 'morador') {
    return role;
  }

  return 'morador';
};

const buildSupabaseEmailCandidates = (identifier: string): string[] => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.includes('@')) {
    return [trimmed];
  }

  return [
    trimmed,
    `${trimmed}@villagio.com`,
    `${trimmed}@villagiodilux.com.br`,
    `${trimmed}@villagio.local`,
  ];
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
      const user = data.user;
      const role = normalizeRole(typeof user?.user_metadata?.role === 'string' ? user.user_metadata.role : undefined);
      const username = typeof user?.user_metadata?.username === 'string'
        ? user.user_metadata.username
        : (user?.email ?? email).replace(/@.*$/, '');
      const name = typeof user?.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : (user?.email?.split('@')[0] ?? username);

      return {
        username,
        role,
        name,
      };
    }

    lastError = new Error(error?.message ?? 'Credenciais inválidas.');
  }

  throw lastError ?? new Error('Credenciais inválidas.');
};
