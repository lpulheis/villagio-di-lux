import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetResidentAccountPassword } from '../../../../src/server/adminUsers.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return resetResidentAccountPassword(req, res);
}
