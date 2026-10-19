# Implementation Plan: Fundação do Monorepo (web, api, mobile + contratos compartilhados)

**Branch**: `001-monorepo-setup` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-monorepo-setup/spec.md`

## Summary

Criar a fundação do Projeto Fono como monorepo **pnpm workspaces + Turborepo**, com três apps
(`apps/web`, `apps/api`, `apps/mobile`) e o pacote `packages/shared` como fonte única de contratos
Zod. Configurações de TypeScript estrito e ESLint ficam em pacotes internos (`packages/tsconfig`,
`packages/eslint-config`). Cada app expõe as tarefas padronizadas `dev | lint | typecheck | build |
test` (api também `db:validate`). O CI (GitHub Actions) roda um job por app, filtrado pelos
workspaces afetados (`turbo run --filter=...[origin/main]`), com cache. Cada app entrega um
"hello" ponta a ponta consumindo o contrato `HealthResponse` de `packages/shared`.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 22 LTS, pnpm 9.x

**Primary Dependencies**:
- Monorepo: Turborepo 2.x, pnpm workspaces
- shared: Zod 3.x (build com tsup → ESM + CJS + `.d.ts`)
- web: React 18 + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Axios, React Router
- api: NestJS 10, `nestjs-zod`, Prisma ORM, `helmet`, `@nestjs/throttler`
- mobile: Expo SDK (React Native) + Expo Router, TanStack Query, Axios

**Storage**: PostgreSQL via Prisma (apenas schema inicial vazio + validação; sem modelos de negócio)

**Testing**: Vitest (shared, web), Jest + Supertest (api), Jest + `jest-expo` (mobile)

**Target Platform**: navegadores modernos (web), Node 22 em container Linux (api), iOS/Android via
Expo (mobile)

**Project Type**: monorepo multi-app (web-app + web-service + mobile-app + biblioteca compartilhada)

**Performance Goals**: CI com cache quente < 1 min sem mudanças (SC-005); PR de um app só ≥ 50%
mais rápido que rodar tudo (SC-004)

**Constraints**: `packages/shared` agnóstico de plataforma (sem `node:*`, DOM ou RN); proibido
`any`; nenhum segredo versionado; apps não importam outros apps

**Scale/Scope**: 3 apps + 3 pacotes internos; equipe pequena; base para crescimento por features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Monorepo e contratos compartilhados | Estrutura `apps/*` + `packages/shared`; contratos só em shared; lint bloqueia import entre apps | ✅ |
| II. TypeScript Zero-Any | `tsconfig` base `strict`, `noUncheckedIndexedAccess`; ESLint `no-explicit-any: error` | ✅ |
| III. Segurança em profundidade | api nasce com `helmet`, CORS por allowlist, throttler, env validado por Zod; guards Firebase ficam para feature de auth | ✅ (parcial, escopo) |
| IV. Test-First e CI/CD | Pipeline `lint → build → test → migrations` por app; merge bloqueado em falha | ✅ |
| V. Frontend feature-based | web nasce com `src/features/`, `src/components/ui/`, `src/lib/`; hello usa TanStack Query + estados Loading/Empty/Error | ✅ |
| VI. Dados e observabilidade | Prisma com `migrate diff` no CI e bloqueio de SQL destrutivo; logs estruturados sem segredos | ✅ |
| Stack oficial | `apps/mobile` (Expo) **não consta** na Constituição v2.0.0 | ⚠️ Justificado (ver Complexity Tracking) |

**Resultado do gate**: APROVADO com uma justificativa registrada.

**Re-check pós-design (Phase 1)**: APROVADO — o contrato `HealthResponse` e o grafo de tarefas
mantêm todos os princípios; nenhuma nova violação.

## Project Structure

### Documentation (this feature)

```text
specs/001-monorepo-setup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── shared-package.md
│   ├── workspace-tasks.md
│   └── ci-pipeline.md
└── tasks.md            # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
.
├── package.json               # scripts raiz, "packageManager": "pnpm@9.x", engines
├── pnpm-workspace.yaml        # apps/*, packages/*
├── turbo.json                 # pipeline de tarefas e cache
├── .npmrc                     # engine-strict=true
├── .nvmrc                     # 22
├── .github/workflows/ci.yml   # jobs: changes, shared, web, api, mobile
├── apps/
│   ├── web/                   # Vite + React
│   │   └── src/{app,features/health,components/ui,lib}/
│   ├── api/                   # NestJS
│   │   ├── src/{main.ts,app.module.ts,config/env.ts,health/}
│   │   ├── prisma/schema.prisma
│   │   └── test/health.e2e-spec.ts
│   └── mobile/                # Expo Router
│       └── src/{app,features/health,lib}/
└── packages/
    ├── shared/                # contratos Zod
    │   └── src/{index.ts,health/health.schema.ts,env/}
    ├── tsconfig/              # base.json, react.json, nest.json, expo.json
    └── eslint-config/         # base, react, nest, react-native
```

**Structure Decision**: monorepo com `apps/` para executáveis e `packages/` para código
compartilhado. Configs de tooling isoladas em pacotes próprios para manter `packages/shared`
puro (somente contratos de domínio).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `apps/mobile` (Expo) fora da stack oficial v2.0.0 | Requisito explícito do usuário na spec | Adiar o mobile deixaria contratos sem validar em RN; ação: emenda MINOR v2.1.0 via `/speckit-constitution` |
| Pacotes extras `packages/tsconfig` e `packages/eslint-config` | Evitar duplicação de config em 4 workspaces (US4/FR-012) | Colocar configs em `packages/shared` misturaria tooling com contratos de runtime |
