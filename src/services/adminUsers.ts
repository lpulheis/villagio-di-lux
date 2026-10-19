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

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as T & ApiMessage;

  if (!response.ok) {
    throw new Error(payload.message ?? 'Não foi possível concluir a operação.');
  }

  return payload;
};

export const listResidentUnitAccounts = async (): Promise<ResidentUnitAccount[]> => {
  const result = await requestAdminApi<{ units: ResidentUnitAccount[] }>('/api/admin/units');
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
