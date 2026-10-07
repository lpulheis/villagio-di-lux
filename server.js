import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 4174;

const staticPortalData = {
  config: {
    condominiumName: 'VILLAGIO DI LUX',
    cnpj: '59.271.694/0001-44',
    portariaAddress: 'Rua Chimangos, 70',
    portariaCep: '06740-572',
    internalAddress: 'Rua Uruguaiana, 69',
    internalCep: '06740-560',
    externalAddress: 'Estrada Ribeirão das Lages, 1270',
    externalCep: '06740-000',
    presentation: 'Portal oficial do condomínio para informações, horários e contatos.',
    phone: '(11) 3333-0000',
    whatsapp: '(11) 99999-0000',
    email: 'contato@villagiodilux.com.br',
    welcomeMessage: 'Bem-vindo ao Portal do Residencial Granja Cristiana.',
    highlightNotice: 'Informações e comunicados importantes do residencial.',
    usefulLinks: ['https://www.google.com', 'https://www.example.com'],
    generalInfo: 'Informações institucionais e procedimentos do condomínio.',
  },
  contacts: [],
  schedules: [],
  events: [],
  professionals: [],
  notices: [],
  documents: [],
  apps: [],
};

app.use(cors());
app.use(express.json());

app.get('/api/portal', (_req, res) => {
  res.json(staticPortalData);
});

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body?.username ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (username === 'admin' && password === 'admin123') {
    return res.json({ user: { username: 'admin', role: 'admin', name: 'Administrador' } });
  }

  return res.status(401).json({ message: 'Credenciais inválidas.' });
});

app.listen(port, () => {
  console.log(`API de cadastro rodando em http://localhost:${port}`);
});
