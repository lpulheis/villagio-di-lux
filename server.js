import express from 'express';
import cors from 'cors';
import { RegistrationService } from './src/services/registrationService.js';
import { CSVRepository } from './src/repositories/CSVRepository.js';

const app = express();
const port = process.env.PORT || 4174;

app.use(cors());
app.use(express.json());

const repository = new CSVRepository();
const service = new RegistrationService(repository);

app.post('/api/registrations', async (req, res) => {
  try {
    await service.submit(req.body);
    res.status(201).json({ message: 'Cadastro registrado com sucesso.' });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Erro ao processar cadastro.' });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API de cadastro rodando em http://localhost:${port}`);
});
