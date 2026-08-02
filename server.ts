import 'dotenv/config';

console.log('USE_GOOGLE_SHEETS:', process.env.USE_GOOGLE_SHEETS);
console.log('KEYFILE:', process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE);
console.log('API_PORT:', process.env.API_PORT);

import express from 'express';
import cors from 'cors';
import { RegistrationService } from './src/services/registrationService.js';
import { CSVRepository } from './src/repositories/CSVRepository.js';
import { GoogleSheetsRepository } from './src/repositories/GoogleSheetsRepository.js';

const app = express();
const port = Number(process.env.API_PORT ?? 4178);

app.use(cors());
app.use(express.json());

const useSheets = process.env.USE_GOOGLE_SHEETS === 'true';
const repository = useSheets ? new GoogleSheetsRepository() : new CSVRepository();
const service = new RegistrationService(repository);
app.post('/api/registrations', async (req, res) => {
  console.log('Recebido:', req.body);

  try {
    await service.submit(req.body);

    console.log('Cadastro salvo com sucesso');

    res.status(201).json({
      message: 'Cadastro registrado com sucesso.'
    });

  } catch (error) {
    console.error('ERRO COMPLETO:', error);

    res.status(500).json({
      message: error instanceof Error ? error.message : String(error)
    });
  }
});
app.listen(port, '0.0.0.0', () => {
  console.log(`API de cadastro rodando em http://localhost:${port}`);
  console.log(`API de cadastro rodando em http://0.0.0.0:${port}`);
});