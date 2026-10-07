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
- Supabase Auth
- Supabase Postgres
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
3. Definir `npm run build` como comando de build e `dist` como diretório de saída.
4. Configurar as variáveis de ambiente do projeto no painel do Vercel.

### Variáveis de ambiente

Use somente as credenciais do Supabase e mantenha segredos fora do código-fonte.

```bash
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY
```

A variável `SUPABASE_SERVICE_ROLE_KEY` deve ficar apenas no ambiente do servidor e nunca no frontend.

### Segurança

- Nunca commitar arquivos `.env`, `.env.local` ou chaves de produção.
- Não armazenar credenciais em repositórios públicos.
- O login usa autenticação do Supabase e a app não depende de Google Sheets, CSV ou service accounts.
- O frontend envia usuário e senha; a validação e o controle de sessão ficam no backend do Supabase.

## Estrutura do projeto

```text
api/
public/
src/
  components/
    ui/
  hooks/
  lib/
  pages/
  repositories/
  services/
  types/
  styles/
  utils/
server.ts
vite.config.ts
```

## Observações

- A base de dados oficial do portal é o Supabase.
- O fluxo mobile-first prioriza clareza e simplicidade.
- O painel administrativo é acessado por roles do Supabase e não depende de arquivos locais.
