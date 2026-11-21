# Implementation Plan: Autenticação e Login do Sistema com Firebase Auth

**Branch**: `002-firebase-auth-login` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-firebase-auth-login/spec.md`

## Summary

Implementar o fluxo completo de autenticação, autorização e gestão de sessão da FonoGames para o escopo **API + Web** utilizando o **Firebase Authentication** exclusivamente como provedor de identidade (login por e-mail/senha, auto-cadastro autônomo, verificação de e-mail, redefinição de senha e emissão de ID Token), mantendo o **PostgreSQL** (via Prisma ORM) como única fonte de verdade para dados de negócio, perfis (`ADMIN`, `PROFISSIONAL`, `PACIENTE`, `AUTONOMO`), estado de primeiro acesso e sessões MFA. A arquitetura centraliza contratos e validações Zod em `@fono/shared` (incluindo política mínima de senha de 8 caracteres com maiúscula e minúscula), sincroniza identidades de forma idempotente em `POST /auth/sync`, aplica uma máquina de estados pós-login determinística no servidor (`AuthNextStep`: `VERIFY_EMAIL` → `CHANGE_PASSWORD` → `MFA_SETUP` → `MFA_VERIFY` → `READY`), implementa **MFA via TOTP (RFC 6238)** no backend com segredo cifrado em AES-256-GCM vinculado ao `auth_time` do Firebase e entrega proteção de computadores compartilhados na Web com timeout de 30 minutos e propagação imediata de logout entre abas sem persistir credenciais ou papéis em `localStorage`/`sessionStorage`.

## Technical Context

**Language/Version**: TypeScript 5.7.3 (`strict: true`), Node.js >= 22, pnpm 10.30.3 (Turborepo 2.4.0)

**Primary Dependencies**:
- `@fono/shared`: `zod` `^3.24.2` (build via `tsup` em ESM + CJS + `.d.ts`)
- `@fono/api`: `@nestjs/common` `^10.4.15`, `@nestjs/core` `^10.4.15`, `@prisma/client` `^6.3.1`, `nestjs-zod` `^4.3.1`, `@nestjs/throttler` `^6.4.0`, `helmet` `^8.0.0`, `firebase-admin` (novo no workspace API), `otpauth` (novo no workspace API, RFC 6238 TOTP)
- `@fono/web`: `react` `^18.3.1`, `vite` `^6.1.0`, `tailwindcss` `^3.4.17`, `react-router-dom` `^6.28.2`, `react-hook-form` `^7.54.2`, `@hookform/resolvers` `^3.10.0`, `@tanstack/react-query` `^5.66.0`, `axios` `^1.7.9`, `lucide-react` `^0.475.0`, `firebase` (novo no workspace Web), `qrcode.react` (novo no workspace Web para QR Code SVG do TOTP)

**Storage**: PostgreSQL gerenciado + Prisma ORM (`apps/api/prisma/schema.prisma`) com modelos `User` (`users`) e `UserMfaSession` (`user_mfa_sessions`) e migrations aditivas não-destrutivas

**Testing**: Vitest `^3.0.5` (`@fono/shared` e `@fono/web` com Testing Library + jsdom), Jest `^29.7.0` + Supertest `^7.0.0` (`@fono/api` unitário e E2E com mocks/emulador do Firebase)

**Target Platform**: Navegadores modernos (aplicação Web React) e servidor Node.js 22 Linux/container (API REST NestJS)

**Project Type**: Monorepo multi-app (`packages/shared` + `apps/api` + `apps/web`; `apps/mobile` permanece inalterado nesta entrega conforme delimitado na spec)

**Performance Goals**: Fluxo completo de login + sincronização + redirecionamento ao painel inicial do perfil abaixo de 5 segundos em condições normais de rede (`SC-001`); propagação de logout e timeout entre abas abertas do mesmo navegador abaixo de 2 segundos (`SC-005`)

**Constraints**:
- Proibido `any` em todo o monorepo; tipos inferidos de schemas Zod em `@fono/shared`
- Firebase Auth restrito à identidade; `role`, `userId` e regras de sessão obtidos exclusivamente do PostgreSQL via `FirebaseAuthGuard` (`checkRevoked: true`) + `@CurrentUser()`
- Proibido armazenar `role`, `userId` ou tokens customizados em `localStorage`/`sessionStorage` na Web
- Segredo TOTP cifrado em repouso (AES-256-GCM) e campos sensíveis redigidos no `StructuredLoggerService` (Axiom)
- Rate limiting de 10 req/min (`@Throttle`) nas rotas mutáveis de `/auth/*` na API combinado à proteção nativa contra força bruta do Firebase Auth (`auth/too-many-requests`) no login/recuperação primária; zero anúncios e zero cores hardcoded no frontend

**Scale/Scope**: 4 perfis de usuário (`ADMIN`, `PROFISSIONAL`, `PACIENTE`, `AUTONOMO`), 7 endpoints em `AuthController`, 3 primitivos UI + 11 páginas/rotas Web dedicadas (públicas, onboarding/MFA e shells iniciais por perfil)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Avaliação Inicial (Pré-Phase 0)

| Princípio / Guardrail | Verificação de Conformidade | Status |
| :--- | :--- | :--- |
| **I. Monorepo e Contratos Compartilhados** | Schemas Zod, enums e tipos (`LoginSchema`, `RegisterAutonomousSchema`, `SyncAuthRequestSchema`, `AuthSessionResponseSchema`, `TotpCodeSchema`, etc.) residem exclusivamente em `packages/shared/src/auth/`. Nenhuma importação direta entre `apps/*`. | ✅ Aprovado |
| **II. Tipagem Estrita (Zero-Any)** | Sem `any`; validação runtime via `zodResolver` na Web, `ZodValidationPipe` na API e `unknown` + Zod para variáveis de ambiente. | ✅ Aprovado |
| **III. Segurança em Profundidade & Menor Privilégio** | `FirebaseAuthGuard` usa `verifyIdToken(..., true)` (`checkRevoked: true`), `SessionReadyGuard` e `RolesGuard` validam acesso no PostgreSQL via `@CurrentUser()`, `@Throttle` limita rotas `/auth/*` a 10 req/min, `helmet`/CORS já ativos no `main.ts`, timeout de 30 min e segredo MFA cifrado com AES-256-GCM. | ✅ Aprovado |
| **IV. Test-First e CI/CD** | Planejados testes unitários em `@fono/shared`, unitários + Supertest E2E (`401`/`403`/`409`/`429`) em `@fono/api` e Vitest + Testing Library em `@fono/web`, alinhados aos pipelines `.github/workflows/ci.yml`. | ✅ Aprovado |
| **V. Frontend Feature-based, Design System & Zero Ads** | Código em `apps/web/src/features/auth/`, primitivos em `apps/web/src/components/ui/`, chamadas Axios + TanStack Query, tokens semânticos de `index.css` (zero hex), WCAG AA, estados Loading/Empty/Error e zero anúncios. | ✅ Aprovado |
| **VI. Banco de Dados, Migrations & Soft Delete** | `User` e `UserMfaSession` no PostgreSQL com `firebase_uid` vinculado via `POST /auth/sync`, `deletedAt` + `status = INACTIVE` (soft delete) e migrations estritamente aditivas validadas por `db:validate`. | ✅ Aprovado |
| **VII. Observabilidade e Monitoramento Seguro** | `StructuredLoggerService` (JSON + Axiom) com lista `SENSITIVE_KEYS` expandida para segredos TOTP, códigos, senhas e chaves privadas Firebase. | ✅ Aprovado |
| **Escopo de Plataformas (`apps/mobile`)** | A Constituição inclui `apps/mobile` na stack da plataforma, porém a especificação aprovada pelo stakeholder delimita esta feature (`002-firebase-auth-login`) a **API + Web**. | ⚠️ Justificado (ver Complexity Tracking) |

### Re-check Pós-Design (Pós-Phase 1)

- **Resultado**: **APROVADO** — Os artefatos [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/) e [quickstart.md](./quickstart.md) preservam integralmente os 7 princípios da Constituição v2.3.0, os Guardrails de Agentes e o `fono-ui-design-system`, sem introduzir nenhuma violação não justificada.

## Project Structure

### Documentation (this feature)

```text
specs/002-firebase-auth-login/
├── spec.md                              # Especificação funcional revisada e validada
├── plan.md                              # Este arquivo (/speckit-plan)
├── research.md                          # Decisões arquiteturais (R-01 a R-08)
├── data-model.md                        # Schema Prisma (User, UserMfaSession) e máquina de estados
├── quickstart.md                        # Guia de setup, testes automatizados e roteiro QA
├── checklists/
│   └── requirements.md                  # Checklist de qualidade da especificação
├── contracts/
│   ├── shared-auth-schemas.md           # Contratos Zod compartilhados (@fono/shared)
│   ├── auth-api.md                      # Endpoints REST, guards e catálogo de erros (@fono/api)
│   └── web-routes-and-session.md        # Rotas Web, hooks TanStack Query e sync entre abas (@fono/web)
└── tasks.md                             # Criado posteriormente pelo comando /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/
└── src/
    ├── index.ts                         # Reexporta módulo ./auth
    └── auth/
        ├── index.ts
        ├── auth.enums.ts                # UserRole, UserStatus, AuthNextStep, AuthErrorCode, constantes
        ├── auth.schema.ts               # Schemas Zod de formulários, DTOs HTTP e sanitização
        └── auth.schema.test.ts          # Testes unitários dos contratos e política de senha

apps/api/
├── .env.example                         # Variáveis Firebase Admin + MFA_ENCRYPTION_KEY (sem segredos)
├── prisma/
│   ├── schema.prisma                    # Enums UserRole/UserStatus + Models User/UserMfaSession
│   └── migrations/
│       └── <timestamp>_add_users_and_mfa_sessions/
│           └── migration.sql            # Migration aditiva (sem DROP/TRUNCATE)
├── src/
│   ├── app.module.ts                    # Registra AuthModule (mantendo ThrottlerModule + PrismaModule)
│   ├── config/
│   │   ├── env.ts                       # Validação Zod de FIREBASE_* e MFA_ENCRYPTION_KEY
│   │   └── env.spec.ts                  # Testes de validação de env de autenticação
│   ├── common/
│   │   └── logger/
│   │       ├── structured-logger.service.ts       # SENSITIVE_KEYS expandido para TOTP/Firebase
│   │       └── structured-logger.service.spec.ts  # Testes de redação de segredos Auth/MFA
│   └── auth/
│       ├── auth.module.ts
│       ├── auth.controller.ts           # Endpoints /auth/* com @Throttle(10 req/min) e ZodValidationPipe
│       ├── auth.service.ts              # Sync idempotente, cálculo de nextStep, logout, reset MFA
│       ├── auth.service.spec.ts
│       ├── firebase-admin.service.ts    # Wrapper Firebase Admin SDK (verifyIdToken checkRevoked: true)
│       ├── totp.service.ts              # Geração/validação TOTP (RFC 6238), anti-replay e AES-256-GCM
│       ├── totp.service.spec.ts
│       ├── guards/
│       │   ├── firebase-auth.guard.ts   # Valida Bearer token e resolve User no PostgreSQL
│       │   ├── session-ready.guard.ts   # Garante nextStep === 'READY' fora de rotas pendentes
│       │   └── roles.guard.ts           # Garante @Roles(...) usando role do PostgreSQL
│       └── decorators/
│           ├── current-user.decorator.ts
│           ├── roles.decorator.ts
│           ├── allow-pending-session.decorator.ts
│           └── allow-unlinked-sync.decorator.ts
└── test/
    └── auth.e2e-spec.ts                 # Supertest: 401/403/409/429, sync, MFA, reset admin

apps/web/
├── .env.example                         # Variáveis VITE_FIREBASE_* (sem segredos)
└── src/
    ├── main.tsx
    ├── lib/
    │   ├── env.ts                       # Validação Zod das env vars VITE_FIREBASE_*
    │   ├── env.test.ts
    │   └── api-client.ts                # Interceptors Axios (Bearer token em memória + tratamento 401/403)
    ├── components/
    │   └── ui/                          # Primitivos shadcn/ui com tokens semânticos e WCAG AA
    │       ├── alert.tsx
    │       ├── input.tsx
    │       └── label.tsx
    ├── app/
    │   ├── providers.tsx                # QueryClientProvider + AuthProvider
    │   └── App.tsx                      # BrowserRouter + rotas públicas, pendentes e protegidas por perfil
    └── features/
        ├── dashboard/
        │   └── components/
        │       └── dashboard-view.tsx   # Integração com usuário autenticado e botão Logout funcional
        └── auth/
            ├── services/
            │   ├── firebase-auth.service.ts       # Inicialização modular Firebase + ações Auth SDK
            │   └── auth-api.service.ts            # Chamadas Axios para /auth/*
            ├── hooks/
            │   ├── use-auth.tsx                   # AuthProvider + hook de contexto
            │   ├── use-auth-session.ts            # Queries/Mutations TanStack Query
            │   ├── use-session-timeout.ts         # Timeout 30 min + BroadcastChannel/storage sync
            │   └── use-session-timeout.test.tsx
            ├── components/
            │   ├── auth-layout.tsx                # Layout lúdico/clínico acessível com tokens semânticos
            │   ├── route-guards.tsx               # PublicOnlyRoute, PendingSessionRoute, RoleRouteGuard
            │   ├── role-home-shell.tsx            # Shell inicial protegido por perfil (sidebar + logout)
            │   └── password-requirements-hint.tsx # Feedback objetivo de senha (8 chars, maiúscula/minúscula)
            └── pages/
                ├── login-page.tsx
                ├── login-page.test.tsx
                ├── register-page.tsx
                ├── register-page.test.tsx
                ├── forgot-password-page.tsx
                ├── forgot-password-page.test.tsx
                ├── verify-email-page.tsx
                ├── force-password-change-page.tsx
                ├── mfa-setup-page.tsx
                ├── mfa-verify-page.tsx
                ├── mfa-pages.test.tsx
                └── role-home-pages.tsx            # AdminHomePage, ProfissionalHomePage, PacienteHomePage
```

**Structure Decision**: A implementação expande diretamente o monorepo existente (`packages/shared`, `apps/api`, `apps/web`) seguindo o padrão feature-based de `apps/web/src/features/<dominio>/` e módulos isolados em `apps/api/src/auth/`. Contratos Zod e constantes compartilhadas vivem exclusivamente em `packages/shared/src/auth/`, mantendo `apps/mobile` preparado para reutilizá-los em uma feature futura sem acoplamento entre apps.

## Complexity Tracking

| Desvio / Decisão Arquitetural | Por Que É Necessário | Alternativa Mais Simples Rejeitada Porque |
| :--- | :--- | :--- |
| **Entrega restrita a `apps/api` + `apps/web` (adiamento de `apps/mobile`)** | Decisão explícita de escopo aprovada pelo stakeholder para entregar o núcleo de autenticação com segurança e velocidade antes de adaptar telas nativas Expo e `expo-secure-store`. | Implementar simultaneamente em Web e Mobile inflaria o escopo e atrasaria a entrega do login web; os contratos em `@fono/shared` já nascem agnósticos de plataforma para futura adoção no Mobile. |
| **MFA TOTP (RFC 6238) gerenciado na API + PostgreSQL (`user_mfa_sessions`)** | O TOTP nativo do Firebase exige upgrade obrigatório para o Google Cloud Identity Platform (plano faturado) e restringe testes automatizados locais/CI; manter TOTP na API permite plano Spark, `SessionReadyGuard` server-side e reset administrativo pelo `ADMIN`. | Usar Identity Platform nativo acoplaria a aplicação a faturamento externo obrigatório e dificultaria os testes E2E determinísticos no CI. |
