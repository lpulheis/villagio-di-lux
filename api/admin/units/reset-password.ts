import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetResidentAccountPassword, sendApiError } from '../../../src/server/adminUsers.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendApiError(res, 405, 'Método não permitido.');
  }

  const residentUserId = typeof req.body?.residentId === 'string' ? req.body.residentId : '';
  if (!residentUserId) {
    return sendApiError(res, 400, 'Informe a conta de morador que deseja redefinir.');
  }

  return resetResidentAccountPassword(req, res, residentUserId);
}
