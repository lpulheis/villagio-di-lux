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

### Contas dos moradores

Na tela **Administração > Usuários**, o síndico e o admin podem criar e redefinir contas das casas 1 a 48. Cada conta usa o login `casaN` (por exemplo, `casa1`) e o perfil `morador`. A senha temporária é `villagiodilux`; no primeiro acesso, o morador precisa criar uma senha pessoal com pelo menos 8 caracteres.

Uma alteração futura de senha deve ser solicitada ao síndico ou ao admin, que pode redefini-la pela mesma tela. O próximo login volta a exigir uma senha pessoal. O frontend nunca recebe a chave de serviço: as operações administrativas são executadas pela API do servidor e exigem `SUPABASE_SERVICE_ROLE_KEY`.

As permissões de gestão são lidas de `app_metadata.role`, que não pode ser alterado pelo próprio usuário. Para sincronizar os perfis de gestão existentes com esse campo protegido, execute uma vez `npm run sync:supabase-roles` com as variáveis do Supabase disponíveis no ambiente local. O script atualiza somente os perfis conhecidos que já existem, não cria usuários e não altera senhas.

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
