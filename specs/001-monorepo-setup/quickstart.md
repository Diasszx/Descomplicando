# Quickstart & Validação: Fundação do Monorepo

## Pré-requisitos
- Node 22 (`nvm use`), Corepack habilitado (`corepack enable`)
- Docker (Postgres local para a api) e Expo Go ou emulador (mobile)

## Setup
```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # repetir para web e mobile
pnpm build
```

## Cenários de validação
| # | Cenário | Comando | Resultado esperado |
|---|---------|---------|--------------------|
| 1 | Instalação única (US1) | `pnpm install` | Sem erros; 6 workspaces listados em `pnpm -r ls --depth -1` |
| 2 | Gerenciador errado | `npm install` | Falha com mensagem exigindo pnpm |
| 3 | Dev completo | `pnpm dev` | web em `http://localhost:5173`, api em `http://localhost:3000` |
| 4 | Dev de um app | `pnpm dev --filter @fono/web` | Só shared + web sobem |
| 5 | Health ponta a ponta (US2) | abrir web e mobile | Tela mostra `status: ok` vindo de `GET /health` |
| 6 | Contrato quebrado (US2) | renomear `service` em `HealthResponseSchema`; `pnpm typecheck` | Falha em web, api e mobile |
| 7 | Import entre apps | importar `apps/web` dentro de `apps/api`; `pnpm lint` | Erro de lint |
| 8 | `any` proibido (US4) | adicionar `const x: any` em cada app; `pnpm lint` | Mesma regra falha em todos |
| 9 | Env inválido | remover `DATABASE_URL`; iniciar api | Falha listando só o nome da chave |
| 10 | Cache | rodar `pnpm ci` duas vezes | 2ª execução `FULL TURBO` < 1 min |
| 11 | CI seletivo (US3) | PR alterando só `apps/web` | Somente job `web` executa |
| 12 | Migration destrutiva | migration com `DROP COLUMN` em PR | Job `api` falha |

Detalhes: [workspace-tasks](./contracts/workspace-tasks.md), [ci-pipeline](./contracts/ci-pipeline.md),
[shared-package](./contracts/shared-package.md).
