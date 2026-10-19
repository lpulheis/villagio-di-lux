import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createResidentAccount, listResidentAccounts } from '../../src/server/adminUsers.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return req.method === 'GET'
    ? listResidentAccounts(req, res)
    : createResidentAccount(req, res);
}
