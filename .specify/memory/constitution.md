<!--
Sync Impact Report:
- Version change: 2.0.0 → 2.1.0 (MINOR: inclusão oficial de `apps/mobile` com Expo/React Native na
  arquitetura do monorepo, na stack tecnológica oficial, no pipeline de CI/CD e nos contratos
  compartilhados; adição de guardrails de segurança e boas práticas para o Agente Mobile)
- Modified principles:
  - I. Monorepo e Contratos Compartilhados: adicionado `apps/mobile` (React Native + Expo) ao lado
    de `apps/web` e `apps/api` consumindo `packages/shared`.
  - IV. Test-First e Qualidade Automatizada (CI/CD): compilação e testes de `apps/mobile` integrados
    ao pipeline obrigatório.
- Added sections:
  - Stack Tecnológica Oficial: entrada dedicada para `apps/mobile`.
  - Guardrails de Agentes: nova subseção `Agente Mobile (apps/mobile)`.
- Removed sections: N/A
- Follow-up TODOs: nenhum.
-->

# Projeto Fono Constitution

Plataforma de acompanhamento e exercícios fonoaudiológicos, estruturada como monorepo
(Turborepo / pnpm workspaces) com TypeScript estrito de ponta a ponta.

## Core Principles

### I. Monorepo e Contratos Compartilhados (Single Source of Truth)
O repositório MUST seguir a estrutura:
- `apps/web`: Frontend Web em React + Tailwind CSS + shadcn/ui.
- `apps/api`: Backend em Node.js + NestJS + Prisma ORM.
- `apps/mobile`: Frontend Mobile em React Native + Expo + Expo Router.
- `packages/shared`: contratos, DTOs e schemas **Zod** compartilhados entre Web, API e Mobile.

Todo contrato de dados MUST ser definido em `packages/shared` e consumido pelas três aplicações.
É PROIBIDO duplicar schemas ou tipos de contrato dentro de `apps/web`, `apps/api` ou `apps/mobile`.
Apps MUST NOT importar código diretamente de outros apps.

### II. Tipagem Estrita de Ponta a Ponta (TypeScript Zero-Any)
O uso de `any` é PROIBIDO. Props, payloads, respostas de API e entidades MUST possuir tipos
explícitos, preferencialmente inferidos dos schemas Zod. Dados de origem incerta MUST usar
`unknown` com type guards ou validação Zod em tempo de execução.

### III. Segurança em Profundidade e Menor Privilégio
- **Transporte e headers:** comunicação exclusivamente via HTTPS/TLS; `helmet` MUST estar ativo
  no NestJS; CORS MUST permitir apenas origens, métodos e cabeçalhos explicitamente autorizados.
- **Identidade vs. autorização:** o Firebase Authentication atua **exclusivamente** como provedor
  de identidade (login, recuperação de senha, emissão de ID Token). O PostgreSQL é a **única
  fonte de verdade** para permissões, perfis (`ADMIN`, `PROFISSIONAL`, `PACIENTE`) e vínculos.
  No primeiro acesso/cadastro, o fluxo MUST passar por `POST /auth/sync`, vinculando o
  `firebase_uid` ao registro da tabela `users`.
- **MFA e sessão:** MFA é obrigatório para `PROFISSIONAL` e `ADMIN` (opcional para `PACIENTE`).
  O frontend (web e mobile) MUST expirar a sessão após 30 minutos de inatividade. O backend MUST
  validar o ID Token via Firebase Admin SDK com `checkRevoked: true`.
- **RBAC e escopo de dados:** decisões de autorização MUST NOT confiar em payloads do cliente.
  Todo endpoint MUST usar `FirebaseAuthGuard` + `RolesGuard`. Toda query ou mutação Prisma
  envolvendo dados de pacientes ou exercícios MUST filtrar pelo `userId`/`profissionalId`
  extraído do token validado (`@CurrentUser()`), prevenindo IDOR.
- **Validação e sanitização:** payloads MUST ser validados no backend via `nestjs-zod` com os
  schemas de `packages/shared`. Strings MUST ser normalizadas nos transforms Zod (`.trim()`,
  remoção de tags HTML contra XSS). Concatenação de strings em SQL é PROIBIDA; MUST-se usar
  consultas parametrizadas do Prisma Client.
- **Rate limiting:** `@nestjs/throttler` com limite global de 100 req/min e limite estrito de
  10 req/min em rotas sensíveis e de autenticação.
- **Secrets:** MUST ser gerenciados via variáveis de ambiente validadas por Zod na inicialização.
  Versionar credenciais no repositório é PROIBIDO.

### IV. Test-First e Qualidade Automatizada (CI/CD)
Regras de negócio e regras de autorização MUST ser desenvolvidas com testes escritos antes ou
junto da implementação. Todo Pull Request MUST passar pelo pipeline do GitHub Actions:
1. `lint`: ESLint + checagem de tipos TypeScript em todos os workspaces afetados.
2. `build`: compilação de `packages/shared`, `apps/api`, `apps/web` e export/typecheck de `apps/mobile`.
3. `test`: Vitest/Jest para Services e Schemas; Jest/jest-expo para componentes e hooks mobile;
   Supertest para integração validando `403 Forbidden` entre perfis e o isolamento por `profissionalId`.
4. `migrations`: validação e aplicação controlada do schema Prisma.

Nenhum merge MUST ocorrer com o pipeline falhando.

### V. Frontend Feature-based, Acessível e Resiliente
- **Arquitetura Web (`apps/web`):** organização estritamente feature-based em `src/features/<dominio>/`
  (`components/`, `hooks/`, `pages/`). `src/components/ui/` é exclusivo para primitivos
  shadcn/ui e `src/lib/` para configuração de Axios e Firebase.
- **Arquitetura Mobile (`apps/mobile`):** organização feature-based em `src/features/<dominio>/`
  (`components/`, `hooks/`), `src/app/` para rotas Expo Router e `src/lib/` para Axios e Firebase.
- **Design system e acessibilidade:**
  - Web: fonte `Inter` (sans-serif); variáveis CSS do shadcn/ui com paleta clínica (primária Azul/Teal);
    suporte a Light/Dark mode; conformidade **WCAG AA** usando primitivos Radix do shadcn/ui.
  - Mobile: componentes acessíveis com labels adequadas (`accessibilityLabel`, `accessibilityRole`),
    suporte a fontes dinâmicas do sistema e contraste clínico padronizado.
- **Integração:** chamadas HTTP MUST ser encapsuladas em instâncias Axios com interceptors que
  injetam o Firebase ID Token e consumidas via custom hooks do **TanStack Query**.
- **Estados:** toda tela ou componente assíncrono MUST implementar explicitamente **Loading**
  (`Skeleton` ou indicador nativo), **Empty** (`EmptyState` padronizado) e **Error** (Toast / `ErrorBoundary`).
- **Componentes:** pequenos, de responsabilidade única e reutilizáveis (SOLID); lógica de estado
  e efeitos complexos MUST ser extraída para hooks.
- **Formulários:** MUST usar validação com schema Zod importado de `packages/shared`.

### VI. Integridade de Dados, Backups e Observabilidade
- **Modelagem:** PostgreSQL gerenciado em nuvem via Prisma ORM. Mídias pesadas (áudio/vídeo de
  usuários) MUST NOT ser armazenadas no banco; usar apenas links externos ou ativos estáticos.
- **Migrations:** toda alteração estrutural MUST ser versionada via `prisma migrate`. Produção
  MUST usar `prisma migrate deploy` de forma atômica, com scripts de rollback prontos.
- **Backups e DRP:** backups diários automatizados com retenção definida e testes periódicos de
  restauração. Metas: **RPO de 24h** e **RTO de 4h**.
- **Observabilidade:** NestJS Observe (logs estruturados e métricas) + **Axiom** (logs e
  telemetria de banco). Logs MUST NOT registrar senhas, tokens ou dados sensíveis.

## Stack Tecnológica Oficial

- **Frontend Web (`apps/web`):** React, TypeScript, Tailwind CSS, shadcn/ui, React Router,
  React Hook Form + Zod, TanStack Query, Axios, Lucide Icons, ESLint.
- **Frontend Mobile (`apps/mobile`):** React Native, Expo, Expo Router, TypeScript,
  TanStack Query, Axios, Lucide Icons (lucide-react-native), `jest-expo`, ESLint.
- **Backend (`apps/api`):** Node.js, TypeScript, NestJS, Prisma ORM, `nestjs-zod`,
  `firebase-admin`, `@nestjs/throttler`, `helmet`.
- **Observabilidade:** NestJS Observe + Axiom.
- **CI/CD:** GitHub Actions.

Adoção de tecnologia fora desta lista MUST ser justificada e aprovada via emenda ou registro
explícito de complexidade no plano da feature.

## Guardrails de Agentes

### Agente Frontend Web (`apps/web`)
- **NUNCA** realizar chamadas `axios` ou `fetch` diretamente em componentes React; usar sempre
  hooks do TanStack Query.
- **NUNCA** armazenar tokens de sessão, chaves privadas ou permissões críticas (`role`) em
  `localStorage`/`sessionStorage` como fonte de verdade de segurança.
- **NUNCA** criar formulários sem `react-hook-form` + schema Zod de `packages/shared`.
- **NUNCA** sobrescrever estilos globais fora do padrão utilitário do Tailwind CSS ou quebrar
  atributos de acessibilidade (`aria-*`) dos componentes shadcn/ui.

### Agente Frontend Mobile (`apps/mobile`)
- **NUNCA** armazenar tokens de sessão, tokens de refresh ou chaves sensíveis em `AsyncStorage` comum —
  utilizar obrigatoriamente armazenamento seguro encriptado nativo (`expo-secure-store`).
- **NUNCA** realizar chamadas `axios` ou `fetch` diretamente em componentes visuais; usar sempre hooks
  encapsulados do TanStack Query.
- **NUNCA** criar formulários ou telas de mutação sem validação atrelada ao schema Zod de `packages/shared`.
- **NUNCA** ignorar acessibilidade nativa — configurar obrigatoriamente `accessible={true}`,
  `accessibilityLabel`, `accessibilityRole` e garantir contraste adequado e suporte a texto redimensionável.
- **NUNCA** importar código diretamente de `apps/web` ou `apps/api`.

### Agente Backend & Database (`apps/api` e `packages/shared`)
- **Arquitetura:** modular NestJS (`Controller` → `Service` → `PrismaService`). Todo endpoint
  MUST declarar seus Guards e validar entradas com `ZodValidationPipe` a partir de
  `packages/shared`.
- **Fluxo de implementação obrigatório:**
  1. Definir/atualizar o contrato Zod em `packages/shared`.
  2. Atualizar `schema.prisma` e gerar migration sem perda de dados.
  3. Implementar o `Service` exigindo o contexto do usuário autenticado (`uid`/`userId` e `role`
     vindos do PostgreSQL) e escrever testes unitários e de autorização (`403 Forbidden`).
- **NUNCA** executar comandos destrutivos nem gerar migrations com `DROP TABLE`, `DROP COLUMN`,
  `TRUNCATE`, `prisma migrate reset` ou `prisma db push --force-reset` sem autorização humana
  explícita.
- **NUNCA** usar `$queryRawUnsafe` ou `$executeRawUnsafe` no Prisma.
- **NUNCA** confiar em `userId`, `profissionalId` ou `role` vindos de `body`, `query` ou
  `params` para checagem de permissão; sempre extrair do banco a partir do `uid` validado pelo
  `FirebaseAuthGuard`.
- **NUNCA** retornar entidades cruas do banco sem filtrar campos internos, nem expor dados de
  pacientes pertencentes a outro `PROFISSIONAL`.
- **NUNCA** registrar tokens, credenciais ou payloads brutos de autenticação nos logs enviados
  ao Axiom / NestJS Observe.

## Governance

Esta Constituição é a autoridade suprema de engenharia, segurança e arquitetura do projeto.
1. **Conformidade:** nenhuma funcionalidade ou refatoração MUST ser integrada se violar estes
   princípios; revisões de PR MUST verificar conformidade, com foco em segurança, IDOR, LGPD
   e manutenibilidade.
2. **Emendas:** exigem proposta documentada, justificativa, aprovação da equipe, plano de
   migração quando aplicável e atualização do Sync Impact Report.
3. **Versionamento semântico:**
   - **MAJOR:** remoção ou redefinição incompatível de princípios/governança.
   - **MINOR:** novo princípio/seção ou expansão material de diretrizes.
   - **PATCH:** esclarecimentos, redação e correções não semânticas.
4. **Revisão de conformidade:** guardrails de agentes MUST ser respeitados por qualquer agente
   automatizado; exceções exigem autorização humana explícita registrada no PR.

**Version**: 2.1.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-10-19
