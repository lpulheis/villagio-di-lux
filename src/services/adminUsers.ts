import { supabase } from '../lib/supabase';

export type ResidentUnitAccount = {
  unit: number;
  username: string;
  exists: boolean;
};

type ApiMessage = {
  message?: string;
};

const requestAdminApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!supabase) {
    throw new Error('Supabase não está configurado.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Não foi possível conectar à API de usuários. Verifique a publicação no Vercel e tente novamente.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`A API de usuários retornou uma resposta inesperada (HTTP ${response.status}). Verifique o roteamento das funções /api no Vercel.`);
  }

  let payload: T & ApiMessage;
  try {
    payload = await response.json() as T & ApiMessage;
  } catch {
    throw new Error(`A API de usuários retornou JSON inválido (HTTP ${response.status}). Verifique os logs da função no Vercel.`);
  }

  if (!response.ok) {
    throw new Error(payload.message ?? `A API de usuários retornou HTTP ${response.status}. Tente novamente ou contate o administrador.`);
  }

  return payload;
};

export const listResidentUnitAccounts = async (): Promise<ResidentUnitAccount[]> => {
  const result = await requestAdminApi<{ units: ResidentUnitAccount[] }>('/api/admin/units');
  if (!Array.isArray(result.units) || result.units.some((account) =>
    !Number.isInteger(account.unit)
    || typeof account.username !== 'string'
    || typeof account.exists !== 'boolean'
  )) {
    throw new Error('A API de usuários retornou uma lista de unidades inválida. Verifique a configuração do Vercel.');
  }
  return result.units;
};

export const createResidentUnitAccount = async (unit: number): Promise<{ username: string; temporaryPassword: string }> =>
  requestAdminApi('/api/admin/units', {
    method: 'POST',
    body: JSON.stringify({ unit }),
  });

export const resetResidentUnitPassword = async (unit: number): Promise<{ username: string; temporaryPassword: string }> =>
  requestAdminApi(`/api/admin/units/${unit}/reset-password`, {
    method: 'POST',
  });
