# Research: Fundação do Monorepo

Todas as incógnitas do Technical Context foram resolvidas abaixo.

## R1. Gerenciador e orquestrador
- **Decision**: pnpm 9 (workspaces) + Turborepo 2.
- **Rationale**: exigido pela Constituição; pnpm tem store eficiente e isolamento estrito; Turbo
  oferece grafo de tarefas, cache local/remoto e `--filter` por mudanças.
- **Alternatives**: Nx (mais poderoso, mais opinativo), npm/yarn workspaces (sem cache de tarefas).

## R2. Travar versões de Node/pnpm e bloquear outros gerenciadores
- **Decision**: `"packageManager": "pnpm@9.x"` (Corepack), `engines` no `package.json`,
  `.npmrc` com `engine-strict=true`, `.nvmrc` = 22 e script `preinstall: npx only-allow pnpm`.
- **Rationale**: cobre edge cases de versão errada e lockfiles divergentes.

## R3. Distribuição de `packages/shared`
- **Decision**: build com **tsup** gerando ESM + CJS + `.d.ts`, `exports` explícito no
  `package.json`; consumido como `"@fono/shared": "workspace:*"`.
- **Rationale**: NestJS (CJS por padrão), Vite (ESM) e Metro (RN) consomem sem configuração
  especial; tipos estáveis para `typecheck`.
- **Alternatives**: "internal package" só com TS fonte (mais simples, mas exige transpile em Nest e
  Metro); TS project references (atrito com Metro).

## R4. Agnosticismo de plataforma do shared
- **Decision**: única dependência runtime = `zod`; regra ESLint `no-restricted-imports` bloqueando
  `node:*`, `react`, `react-native`, `@nestjs/*`, `@prisma/*`; `tsconfig` com `lib: ["ES2022"]`
  (sem DOM).
- **Rationale**: atende FR-005 e o edge case de dependência exclusiva de plataforma.

## R5. Mobile
- **Decision**: Expo SDK estável + Expo Router, TypeScript estrito, Metro com suporte a monorepo
  (`watchFolders` e `nodeModulesPaths` via `expo/metro-config`); `node-linker=hoisted` limitado ao
  necessário via `.npmrc` se o Metro exigir.
- **Rationale**: melhor DX para RN em monorepo pnpm; build nativo via EAS fora do escopo.
- **Alternatives**: React Native CLI puro (mais configuração nativa).

## R6. Bloqueio de import entre apps
- **Decision**: ESLint `import/no-restricted-paths` (ou `no-restricted-imports` com padrões
  `apps/*` e `@fono/web|api|mobile`); apps não são publicados como dependências.
- **Rationale**: FR-006 verificável no `lint`.

## R7. CI por app com execução seletiva
- **Decision**: um workflow `ci.yml` com job `changes` (detecção via
  `turbo run build --filter=...[origin/main] --dry=json`) e jobs `web`, `api`, `mobile`
  condicionados a esse resultado; cada job roda `turbo run lint typecheck build test --filter=<app>...`.
  Cache: `actions/setup-node` com cache pnpm + `.turbo` via `actions/cache`. Branch protection
  exige os checks.
- **Rationale**: status separado por app (FR-010) e economia de tempo (SC-004/005).
- **Alternatives**: workflows separados com `paths:` (não entende dependência via shared);
  Turbo Remote Cache (opcional, futuro).

## R8. Migrations no CI
- **Decision**: job da api sobe Postgres como service, roda `prisma validate`,
  `prisma migrate deploy` em banco efêmero e script que falha se SQL de migration nova contiver
  `DROP TABLE|DROP COLUMN|TRUNCATE` sem label `allow-destructive-migration` no PR.
- **Rationale**: Princípio VI e guardrails do agente backend.

## R9. Validação de env
- **Decision**: cada app valida env com schema Zod próprio (`apps/*/src/config/env.ts`); helpers
  genéricos (ex.: `parseEnv`) em `packages/shared/src/env`. Apenas `.env.example` versionado;
  `gitleaks` no CI.
- **Rationale**: FR-013, SC-006.

## R10. Ferramentas de teste
- **Decision**: Vitest (shared, web), Jest + Supertest (api — padrão Nest), `jest-expo` (mobile).
- **Rationale**: ferramentas idiomáticas de cada ecossistema, todas expostas como tarefa `test`.
