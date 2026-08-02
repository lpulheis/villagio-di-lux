import type { VercelRequest, VercelResponse } from '@vercel/node';

import { RegistrationService } from '../src/services/registrationService.js';
import { CSVRepository } from '../src/repositories/CSVRepository.js';
import { GoogleSheetsRepository } from '../src/repositories/GoogleSheetsRepository.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log('API registrations iniciada');
  console.log('Método:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed',
    });
  }

  try {
    const useSheets = process.env.USE_GOOGLE_SHEETS === 'true';

    console.log('USE_GOOGLE_SHEETS:', useSheets);
    console.log(
      'GOOGLE_SERVICE_ACCOUNT_JSON existe:',
      !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    );
    console.log(
      'GOOGLE_SHEETS_ID existe:',
      !!process.env.GOOGLE_SHEETS_ID
    );

    const repository = useSheets
      ? new GoogleSheetsRepository()
      : new CSVRepository();

    console.log('Repository criado');

    const service = new RegistrationService(repository);

    await service.submit(req.body);

    console.log('Cadastro salvo com sucesso');

    return res.status(201).json({
      message: 'Cadastro registrado com sucesso.',
    });

  } catch (error) {
    console.error('ERRO COMPLETO:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Erro ao processar cadastro.';

    const statusCode =
      message.includes('já possui') ||
      message.includes('repetido') ||
      message.includes('está repetido')
        ? 400
        : 500;

    return res.status(statusCode).json({
      message,
    });
  }
}
