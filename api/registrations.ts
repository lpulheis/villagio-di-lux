import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { RegistrationService } from '../src/services/registrationService.js';
import { CSVRepository } from '../src/repositories/CSVRepository.js';
import { GoogleSheetsRepository } from '../src/repositories/GoogleSheetsRepository.js';

const useSheets = process.env.USE_GOOGLE_SHEETS === 'true';
const repository = useSheets ? new GoogleSheetsRepository() : new CSVRepository();
const service = new RegistrationService(repository);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    await service.submit(req.body);
    res.status(201).json({ message: 'Cadastro registrado com sucesso.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar cadastro.';
    const statusCode = message.includes('já possui') || message.includes('repetido') || message.includes('está repetido') ? 400 : 500;
    res.status(statusCode).json({ message });
  }
}
