# Portal Villagio Di Lux

Aplicação web minimalista para cadastro de moradores e envio de convites de acesso ao aplicativo de abertura do portão.

## Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS
- React Hook Form
- Zod
- Lucide React
- Papa Parse
- ESLint
- Prettier

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Para rodar a API local junto com a aplicação:

```bash
npm run serve:api
npm run dev
```

ou

```bash
npm run dev:all
```

## Build

```bash
npm run build
```

## Deploy

1. Criar repositório no GitHub.
2. Conectar o repositório ao Vercel.
3. O Vercel detecta automaticamente o projeto Vite.
4. Definir `npm run build` como comando de build e `dist` como diretório de saída.
5. Configurar as variáveis de ambiente do projeto no painel do Vercel.

### Variáveis de ambiente do Vercel

Para produção, mantenha o Google Sheets como base de dados e nunca deixe credenciais no código-fonte.

```bash
USE_GOOGLE_SHEETS=true
GOOGLE_SHEETS_ID=SEU_ID_DA_PLANILHA
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

A variável `GOOGLE_SERVICE_ACCOUNT_JSON` deve receber o conteúdo completo do arquivo JSON do service account do Google.

Para desenvolvimento local, também é aceito:

```bash
GOOGLE_SERVICE_ACCOUNT_KEYFILE=./credentials/service-account.json
```

### Segurança

- Nunca commitar o arquivo `credentials/service-account.json` em repositório público.
- Não usar senha fixa no frontend.
- Mantém o login no backend e os usuários na aba `USUARIOS` do Sheets.
- O frontend só envia username/password; o servidor valida no backend.

## Estrutura do projeto

```
src/
  components/
    ui/
  hooks/
  repositories/
  services/
  types/
  utils/
  styles/
public/
cadastros.csv
server.js
vite.config.ts
```

## Integração com Google Sheets

A arquitetura usa um repositório (`RegistrationRepository`) com implementações diferentes:

- `CSVRepository`: usa arquivo local `cadastros.csv` para desenvolvimento.
- `GoogleSheetsRepository`: preparado para substituição em produção.

Para ativar o Google Sheets futuramente:

1. Implementar `findByEmail` e `save` em `src/repositories/GoogleSheetsRepository.ts`.
2. Adicionar variáveis de ambiente para `GOOGLE_SHEETS_API_KEY`, `GOOGLE_SHEET_ID` e outras credenciais.
3. Utilizar a instância do repositório no serviço de cadastro.

## Observações

- O fluxo mobile-first prioriza clareza e simplicidade.
- O formulário exibe uma mensagem informativa quando o aplicativo Tuya Smart não está instalado.
- O cadastro não permite envio duplicado de e-mails mesmo com nomes ou casas diferentes.
