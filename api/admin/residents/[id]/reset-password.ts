import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetResidentAccountPassword } from '../../../../src/server/adminUsers.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const userId = typeof req.query.id === 'string' ? req.query.id : '';
  return resetResidentAccountPassword(req, res, userId);
}
