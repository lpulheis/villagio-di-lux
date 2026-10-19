import type { VercelRequest, VercelResponse } from '@vercel/node';
import { changeRequiredPassword } from '../../../src/server/adminUsers.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return changeRequiredPassword(req, res);
}
