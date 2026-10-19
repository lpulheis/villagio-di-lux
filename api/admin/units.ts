import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleVercelRequest } from '../../vercelHandler';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleVercelRequest(req, res);
}
