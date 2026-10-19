import type { Request, Response } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from './server';

export const handleVercelRequest = (req: VercelRequest, res: VercelResponse) =>
  app(req as unknown as Request, res as unknown as Response);
