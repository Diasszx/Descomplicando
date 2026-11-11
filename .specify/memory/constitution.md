<!--
Sync Impact Report:
- Version change: 2.2.0 → 2.3.0 (MINOR: consolidação oficial da especificação canônica da FonoGames,
  incorporando a arquitetura dos dois modelos de utilização — Modelo Fonoaudiológico e Modelo Autônomo —,
  a especificação dos 4 perfis de usuário com comutação de contexto clínico no fonoaudiólogo, e a
  formalização detalhada dos requisitos de Segurança, Banco de Dados, Backend, Frontend, Stack Oficial
  e Guardrails de Agentes).
- Modified principles:
  - III. Segurança em Profundidade e Menor Privilégio: expansão dos requisitos de segurança de rede
    (HTTPS + helmet), MFA por perfil, sanitização de inputs, prevenção estrita de SQLi, política de
    segredos e DRP (RPO 24h, RTO 4h).
  - V. Frontend Feature-based, Identidade Visual e Zero Anúncios: incorporação dos requisitos de interface
    para ambos os modelos de uso, estados visuais obrigatórios e diretriz estrita de zero publicidade.
  - VI. Integridade de Dados, Migrations e Backups: formalização da separação Firebase Auth vs PostgreSQL,
    sincronização via POST /auth/sync e proibição de comandos destrutivos.
- Added sections:
  - Modelos de Utilização e Perfis de Acesso (Visão Geral, Modelo Fonoaudiológico vs Autônomo,
    e detalhamento de ADMIN, PROFISSIONAL, PACIENTE e AUTONOMO).
  - Princípio VII: Observabilidade e Monitoramento Seguro (NestJS Observe + Axiom).
- Removed sections: N/A
- Follow-up TODOs: nenhum.
-->

# FonoGames Constitution

Plataforma de apoio à intervenção fonoaudiológica que utiliza jogos digitais e gamificação como
recursos complementares, estruturada como monorepo (Turborepo / pnpm workspaces) com TypeScript
estrito de ponta a ponta.

---

## Modelos de Utilização e Perfis de Acesso

### Modelos de Utilização
1. **Modelo Fonoaudiológico (Clínico):**
   * O fonoaudiólogo gerencia seus pacientes, prescreve jogos específicos e acompanha o progresso clínico.
   * **Perfil de Teste Automático:** O fonoaudiólogo possui um perfil próprio criado automaticamente no cadastro para jogar livremente qualquer atividade sem poluir o prontuário dos pacientes.
   * **Contexto do Paciente Selecionado:** Ao selecionar um paciente na lista, o profissional entra no contexto clínico deste paciente; qualquer jogo executado nessa sessão grava as métricas e o histórico diretamente no prontuário do paciente selecionado.
2. **Modelo de Uso Autônomo (Pessoa Comum):**
   * O usuário cria sua própria conta de forma independente.
   * Acessa um painel individual contendo seu perfil, catálogo completo e livre de jogos e dashboard de progresso pessoal.
   * Não possui ferramentas clínicas (não cadastra pacientes nem gera credenciais para terceiros).

### Perfis de Usuário (Roles)
* **`ADMIN` (Gestor do Sistema):** Responsável por gerenciar os cadastros globais de conteúdo base (áreas terapêuticas, habilidades, objetivos clínicos, exercícios e jogos) e administrar contas de profissionais. MFA obrigatório.
* **`PROFISSIONAL` (Fonoaudiólogo):** Possui perfil individual automático para testes livres, gerencia pacientes, prescreve jogos conforme o plano terapêutico e alterna para o contexto do paciente para registro clínico de sessões. MFA obrigatório.
* **`PACIENTE`:** Acessa a plataforma com credenciais geradas pelo fonoaudiólogo; visualiza e executa exclusivamente os jogos liberados em seu plano terapêutico; personaliza avatar e acompanha seu desempenho em dashboard simples. Em menores de idade, o responsável legal utiliza essas credenciais para acompanhamento doméstico. MFA opcional.
* **`AUTONOMO` (Usuário Autônomo):** Usuário comum com acesso ao catálogo completo de jogos e métricas de desempenho pessoal, sem permissões clínicas. MFA opcional.

---

## Core Principles

### I. Monorepo e Contratos Compartilhados (Single Source of Truth)
O repositório MUST seguir a arquitetura monorepo padronizada:
- `apps/web`: Frontend Web em React + Vite + Tailwind CSS + shadcn/ui.
- `apps/api`: Backend REST em Node.js + NestJS + Prisma ORM.
- `apps/mobile`: Frontend Mobile em React Native + Expo + Expo Router.
- `packages/shared`: contratos, DTOs e schemas **Zod** compartilhados entre Web, API e Mobile.

Todo contrato de dados (payloads de requisição, respostas, DTOs e validações) MUST ser definido em
`packages/shared` e consumido pelas aplicações clientes e pelo backend. É PROIBIDO duplicar schemas
ou tipos em `apps/web`, `apps/api` ou `apps/mobile`. Apps MUST NOT importar código diretamente entre si.

### II. Tipagem Estrita de Ponta a Ponta (TypeScript Zero-Any)
O uso de `any` é PROIBIDO em todos os pacotes e aplicações. Props, parâmetros, retornos de função,
entidades e payloads MUST possuir tipos estritos e explícitos, preferencialmente inferidos dos schemas
Zod (`z.infer<typeof schema>`). Dados de origem externa ou incerta MUST usar `unknown` combinado com
validação Zod em tempo de execução ou type guards explícitos.

### III. Segurança em Profundidade, Menor Privilégio e Isolamento de Contexto
- **Transporte e Cabeçalhos:** Toda comunicação em produção MUST ser estritamente via HTTPS/TLS. O NestJS
  MUST utilizar o middleware `helmet` para configurar cabeçalhos de proteção (HSTS, CSP, X-Frame-Options).
  CORS MUST ser configurado no `main.ts` restringindo origens, métodos HTTP e cabeçalhos autorizados.
- **Identidade vs. Autorização:** O **Firebase Authentication** atua exclusivamente como provedor de
  identidade (cadastro, login, redefinição de senha e emissão de ID Token). O **PostgreSQL é a única fonte
  de verdade** para dados de negócio, permissões (`role`), vínculos clínicos e dados de jogos.
  No primeiro acesso, o cliente MUST chamar `POST /auth/sync`, vinculando o `firebase_uid` à tabela `users`.
- **MFA (Multi-Factor Authentication):** Obrigatório para os perfis `ADMIN` e `PROFISSIONAL`; opcional para
  `PACIENTE` e `AUTONOMO`.
- **Validação Centralizada e Sanitização:** Entradas MUST ser validadas por schemas Zod no frontend (via
  React Hook Form) e no backend (via `nestjs-zod` com `ZodValidationPipe`). Sanitização contra XSS MUST ser
  aplicada nos transforms Zod (como `.trim()` e remoção/escape de tags HTML maliciosas).
- **Prevenção de SQL Injection (SQLi):** Consultas ao banco de dados MUST utilizar estritamente o Prisma ORM
  com queries parametrizadas. É terminantemente PROIBIDO o uso de `$queryRawUnsafe` ou `$executeRawUnsafe`.
- **Gerenciamento de Segredos (Secrets):** Chaves do Firebase, credenciais de banco e tokens de telemetria
  MUST ser mantidos fora do código-fonte, configurados via variáveis de ambiente (`.env` local ignorado no Git
  e GitHub Secrets no CI/CD) e validados por schema Zod no boot da API.
- **Princípio do Menor Privilégio (PMP) e Prevenção de IDOR:**
  - A API MUST validar permissões com `FirebaseAuthGuard` (com `checkRevoked: true`) e `RolesGuard`.
  - O `userId` e o `role` do usuário autenticado MUST ser extraídos exclusivamente do PostgreSQL a partir
    do `uid` verificado, injetados via `@CurrentUser()`.
  - Toda operação de leitura ou escrita envolvendo pacientes, planos ou sessões MUST filtrar pelo
    `profissionalId` do fonoaudiólogo autenticado, impedindo acesso a dados de outros profissionais.
  - Na execução de jogos pelo fonoaudiólogo, a gravação de métricas no prontuário do paciente exige que
    o paciente pertença comprovadamente à carteira ativa do profissional autenticado.
- **Rate Limiting:** Implementado com `@nestjs/throttler` com limite global de 100 req/min e limite
  estrito de 10 req/min em rotas sensíveis (autenticação, sincronização e recuperação de credenciais).
- **Sessão:** Timeout por inatividade de 30 minutos no cliente (web e mobile), combinado com a checagem
  de revogação de token no backend.
- **Plano de Recuperação de Desastres (DRP):** Metas de **RPO de 24 horas** e **RTO de 4 horas**, apoiadas
  em rotinas de backup diário automatizado do PostgreSQL gerenciado e deploy automatizado via CI/CD.

### IV. Test-First e Qualidade Automatizada (CI/CD)
Regras de negócio, contratos Zod e checagens de autorização MUST ser desenvolvidos acompanhados de
testes automatizados. Todo Pull Request MUST passar pelas 4 etapas obrigatórias do GitHub Actions:
1. `lint`: ESLint e checagem de tipos TypeScript (`tsc --noEmit`) em todos os workspaces.
2. `build`: Compilação de `packages/shared`, `apps/api`, `apps/web` e typecheck/export de `apps/mobile`.
3. `test`: Vitest/Jest para Services, DTOs e componentes; Supertest para testes de integração HTTP
   validando respostas `403 Forbidden` em tentativas de acesso indevido ou cruzado.
4. `migrations`: Validação e verificação de integridade das migrations do Prisma (`prisma migrate deploy`).

Nenhum merge MUST ser realizado caso qualquer etapa do pipeline falhe.

### V. Frontend Feature-based, Identidade Visual Lúdica/Clínica e Zero Anúncios
- **Arquitetura Feature-based:** Estruturação em `src/features/<dominio>/` (`components/`, `hooks/`, `pages/`).
  A pasta `src/components/ui/` é reservada exclusivamente para primitivos shadcn/ui e `src/lib/` para utilitários.
- **Design System Canônico ([`fono-ui-design-system`](file:///.agents/skills/fono-ui-design-system/SKILL.md)):**
  - **Paleta e Tipografia:** Fundo suave `#F8FAFC`, tipografia `Inter`, paleta clínica Azul/Teal com gradientes
    temáticos vibrantes para os jogos (Rosa Coral, Esmeralda, Violeta, Azul Royal e Âmbar).
  - **Acessibilidade:** Conformidade integral com **WCAG AA** utilizando primitivos Radix UI, contraste
    mínimo adequado, anel de foco visível (`focus-visible:ring-2`) e suporte completo a teclado (`Tab`, `Enter`, `Space`).
  - **Layout do Dashboard:** Sidebar com pílulas arredondadas (item ativo em tom pastel amarelo suave `#FEF7DA`),
    cabeçalho com `Overview`, notificações e as 4 métricas chave (Em andamento, Concluídos, Categorias, Conquistas).
  - **Cards de Jogos com Efeito Hover:** Contorno `rounded-3xl`, banner ilustrado colorido com leve zoom no
    hover (`scale-108`), elevação suave do card (`-translate-y-2` com `shadow-xl`) e botão circular de Play
    em Teal com animação no hover (`scale-115`).
  - **ZERO PROPAGANDAS (Plataforma 100% Livre de Anúncios):** Por ser uma ferramenta clínica de saúde e
    reabilitação, é expressamente PROIBIDO exibir anúncios de terceiros ou textos promocionais como
    "remova anúncios" ou "sem anúncios". Destaques de planos Pro/Clínicos focam exclusivamente em valor
    médico-terapêutico (relatórios avançados, prontuários, IA diagnóstica).
- **Consumo de APIs e Estados de Interface:** Chamadas HTTP MUST ser encapsuladas em serviços Axios com
  interceptors e consumidas via custom hooks do **TanStack Query**. Toda busca assíncrona MUST tratar
  explicitamente os 3 estados visuais:
  - **Loading:** `Skeleton` estrutural.
  - **Empty:** `EmptyState` contextual com orientação.
  - **Error:** `Toast` contextual ou `ErrorBoundary` com opção de retry.

### VI. Banco de Dados Relacional, Integridade e Migrations Controladas
- **Fonte da Verdade:** PostgreSQL gerenciado em nuvem com Prisma ORM. Perfis, permissões, pacientes,
  prontuários, objetivos terapêuticos e métricas de sessões residem exclusivamente no banco relacional.
- **Sincronização com Provedor de Identidade:** O vínculo entre o Firebase Auth e a tabela `users` ocorre
  estritamente via `firebase_uid` na rota `POST /auth/sync`.
- **Migrations Controladas:** Toda alteração de schema MUST ser versionada pelo Prisma Migrate (`prisma migrate dev`
  em desenvolvimento e `prisma migrate deploy` no CI/CD). Comandos destrutivos (`DROP TABLE`, `DROP COLUMN`,
  `TRUNCATE`, `prisma migrate reset`, `prisma db push --force-reset`) são PROIBIDOS em produção.
- **Soft Delete em Saúde:** A exclusão de pacientes, planos ou registros clínicos de prontuário MUST utilizar
  obrigatoriamente exclusão lógica (`deletedAt: DateTime?`, `status: 'INACTIVE'`) para preservação histórica.
- **Backups e Rollback:** Backups diários com retenção definida e scripts de reversão mapeados para restauração rápida.

### VII. Observabilidade e Monitoramento Seguro
- **Logs Estruturados:** A aplicação NestJS MUST utilizar o **NestJS Observe** para geração de logs em formato
  JSON estruturado e coleta de métricas de performance.
- **Telemetria com Axiom:** Ingestão de logs e telemetria de consultas de banco de dados centralizadas no **Axiom**.
- **Privacidade de Dados de Saúde:** Os logs MUST NOT registrar senhas, tokens de autorização (JWT/Bearer),
  cabeçalhos de autenticação ou dados sensíveis de pacientes nos payloads de log.

---

## Stack Tecnológica Oficial

- **Arquitetura de Repositório:** Monorepo (Turborepo + pnpm workspaces).
- **Frontend Web (`apps/web`):** React 18+, TypeScript estrito, Vite, Tailwind CSS, shadcn/ui (Radix UI),
  React Router, React Hook Form + Zod, TanStack Query, Axios, Lucide Icons, Vitest, ESLint.
- **Frontend Mobile (`apps/mobile`):** React Native, Expo, Expo Router, TypeScript estrito, TanStack Query,
  Axios, Lucide Icons (`lucide-react-native`), `jest-expo`, ESLint.
- **Backend API (`apps/api`):** Node.js 22+, TypeScript estrito, NestJS, Prisma ORM, `nestjs-zod`,
  Firebase Admin SDK, `@nestjs/throttler`, `helmet`, Vitest/Jest, Supertest.
- **Banco de Dados:** PostgreSQL (gerenciado em nuvem) + Prisma ORM.
- **Observabilidade:** NestJS Observe + Axiom.
- **CI/CD:** GitHub Actions (lint, build, test, migrations).

---

## Guardrails de Agentes

### Agente Frontend Web (`apps/web`)
- ❌ **NUNCA** realizar chamadas `axios` ou `fetch` soltas diretamente no corpo de componentes React — isolar em serviços e custom hooks do TanStack Query.
- ❌ **NUNCA** confiar em perfis (`role`), `userId` ou tokens persistidos no `localStorage`/`sessionStorage` para validações críticas de segurança.
- ❌ **NUNCA** criar formulários fora do padrão `react-hook-form` + schema Zod compartilhado (`packages/shared`).
- ❌ **NUNCA** remover ou omitir atributos de acessibilidade (`aria-*`) dos primitivos Radix UI/shadcn.
- ❌ **NUNCA** criar cards de jogos como caixas estáticas cinzas — aplicar obrigatoriamente o componente `GameCard` com banner colorido temático e micro-interação de hover.
- ❌ **NUNCA** incluir anúncios, propagandas ou textos do tipo "sem anúncios" / "remover propagandas" na interface.

### Agente Frontend Mobile (`apps/mobile`)
- ❌ **NUNCA** armazenar tokens de sessão ou chaves privadas em `AsyncStorage` comum — usar `expo-secure-store`.
- ❌ **NUNCA** realizar chamadas HTTP diretas em componentes visuais.
- ❌ **NUNCA** omitir acessibilidade nativa (`accessible={true}`, `accessibilityLabel`, `accessibilityRole`).
- ❌ **NUNCA** importar código diretamente de `apps/web` ou `apps/api`.

### Agente Backend & Database (`apps/api` e `packages/shared`)
- ❌ **NUNCA** executar comandos SQL destrutivos (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`) ou comandos CLI perigosos (`prisma migrate reset`, `prisma db push --force-reset`).
- ❌ **NUNCA** utilizar `$queryRawUnsafe` ou `$executeRawUnsafe` no Prisma.
- ❌ **NUNCA** confiar em `userId`, `profissionalId` ou `role` passados via body, query ou params da requisição — sempre obter a identidade verificada do PostgreSQL via `@CurrentUser()`.
- ❌ **NUNCA** retornar dados clínicos ou prontuários de pacientes sem filtrar pelo `profissionalId` do fonoaudiólogo responsável.
- ❌ **NUNCA** registrar senhas, tokens, cabeçalhos `Authorization` ou dados clínicos sensíveis nos logs enviados ao Axiom.

---

## Governance

Esta Constituição é a autoridade suprema de engenharia, arquitetura e segurança da **FonoGames**.
1. **Conformidade Obrigatória:** Nenhum Pull Request ou implementação MUST ser aceito se violar qualquer princípio desta Constituição.
2. **Procedimento de Emenda:** Qualquer alteração nos princípios ou na governança exige proposta documentada, justificativa técnica, plano de migração e atualização do Sync Impact Report.
3. **Versionamento Semântico:**
   * **MAJOR:** Alteração estrutural ou remoção incompatível de princípios de governança ou segurança.
   * **MINOR:** Adição de novo princípio, perfil de usuário, modelo de uso ou expansão material das diretrizes.
   * **PATCH:** Refinamento de redação, correções tipográficas e esclarecimentos não-semânticos.
4. **Revisão de Conformidade:** Todos os agentes automatizados e desenvolvedores MUST aderir integralmente aos Guardrails de Agentes.

**Version**: 2.3.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-11-11
