# Projeto Fono — Monorepo

Plataforma de acompanhamento e exercícios fonoaudiológicos desenvolvida em **Monorepo** (Turborepo + pnpm workspaces) com tipagem estrita de ponta a ponta e arquitetura orientada a contratos compartilhados.

## Estrutura do Repositório

```text
├── apps/
│   ├── web/        # Frontend Web em React 18 + Vite + Tailwind CSS + shadcn/ui
│   ├── api/        # Backend em NestJS + Prisma ORM + nestjs-zod + helmet
│   └── mobile/     # Frontend Mobile em React Native + Expo 52 + Expo Router
└── packages/
    ├── shared/     # Fonte única de verdade: Schemas Zod, DTOs e contratos
    ├── tsconfig/   # Presets compartilhados de TypeScript estrito (Zero-Any)
    └── eslint-config/ # Configurações compartilhadas de ESLint (flat config)
```

## Pré-requisitos

- **Node.js**: `>= 22` (recomendado Node 22 LTS ou superior)
- **pnpm**: `>= 9` (gerenciador de pacotes obrigatório; o uso de `npm` ou `yarn` é bloqueado via script `preinstall`)
- **Docker**: Para execução do PostgreSQL local da API (opcional para desenvolvimento web/mobile isolado)

## Instalação Rápida

1. Clone o repositório:
   ```bash
   git clone <repo-url>
   cd descomplicando
   ```

2. Instale todas as dependências em um único comando:
   ```bash
   pnpm install
   ```

3. Configure os arquivos de ambiente:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   cp apps/mobile/.env.example apps/mobile/.env
   ```

## Comandos do Monorepo

Todos os comandos são executados a partir da raiz através do **Turborepo**:

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia todos os workspaces em modo de desenvolvimento |
| `pnpm dev --filter @fono/web` | Inicia apenas o frontend Web e dependências internas |
| `pnpm dev --filter @fono/api` | Inicia apenas o backend API |
| `pnpm dev --filter @fono/mobile` | Inicia o servidor Metro do Expo para mobile |
| `pnpm build` | Compila todos os pacotes e aplicações respeitando a ordem de dependências |
| `pnpm lint` | Executa o linter com verificação estrita de tipagem (proibição de `any`) |
| `pnpm typecheck` | Executa a verificação estrita de tipos do TypeScript sem emitir código |
| `pnpm test` | Executa as suítes de testes unitários e de integração em todos os workspaces |
| `pnpm format` | Formata todo o código com Prettier |
| `pnpm ci` | Executa a pipeline completa localmente (`lint`, `typecheck`, `build`, `test`, `db:validate`) |

## Princípios de Arquitetura e Segurança

- **Contratos Compartilhados (`packages/shared`)**: Nenhum schema ou contrato pode ser duplicado entre frontend e backend. Qualquer alteração incompatível falha a checagem de tipos em todas as aplicações consumidoras.
- **Isolamento de Aplicações**: É terminantemente proibido importar código diretamente entre `apps/*`. Compartilhamento ocorre exclusivamente via `packages/shared`.
- **Zero-Any**: Todas as propriedades, contratos e retornos são fortemente tipados.
- **Defesa em Profundidade**: O backend implementa `helmet`, CORS com allowlist, rate limiting via `@nestjs/throttler` e logger estruturado com sanitização automática de dados sensíveis.
- **Prevenção de Migrations Destrutivas**: A pipeline bloqueia automaticamente qualquer migration SQL contendo `DROP TABLE`, `DROP COLUMN` ou `TRUNCATE` sem autorização explícita via label de Pull Request.


## Deploy no Render + Neon (PostgreSQL Serverless)

O ambiente de testes/produção utiliza **Neon** (PostgreSQL 16 Serverless gratuito) e **Render** (`fono-api` como Web Service Node.js e `fono-web` como Static Site gratuito com CDN global e SPA rewrite), configurados declarativamente via [`render.yaml`](render.yaml).

### Passo a passo rápido:
1. Crie um banco no **[Neon](https://neon.tech)** e copie a `DATABASE_URL` (`?sslmode=require`).
2. No **[Render](https://dashboard.render.com)**, clique em **New → Blueprint** e conecte este repositório.
3. Preencha `DATABASE_URL`, `CORS_ORIGINS` (URL do `fono-web`, ex.: `https://fono-web.onrender.com`) e `VITE_API_URL` (URL do `fono-api`, ex.: `https://fono-api.onrender.com`).
