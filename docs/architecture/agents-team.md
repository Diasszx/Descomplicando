# Manual de Operação dos Agentes — Projeto Fono

Este documento consolida a estrutura, responsabilidades e os **guardrails de segurança** implementados no ambiente de desenvolvimento com base no **Manual Técnico — Projeto Fono**.

---

## 1. Orquestrador Geral (`fono-master-orchestrator`)
* **Papel:** Líder técnico de engenharia e guardião do ciclo de vida do projeto.
* **Base de Conhecimento:** [Manual técnico projeto fono.md](file:///c:/Users/N01/Downloads/Manual%20t%C3%A9cnico%20projeto%20fono.md).
* **Metodologia de Execução (Spec-kit):**
  1. `specify`: Captura de requisitos funcionais e critérios de aceite clínicos.
  2. `plan`: Arquitetura do monorepo, contratos em `packages/shared`, schemas Zod e modelagem Prisma.
  3. `tasks`: Lista atômica e sequencial de tarefas no `tasks.md`.
  4. `analyze`: Análise não-destrutiva de consistência antes de codificar.
  5. `implement`: Delegação e orquestração entre os especialistas Front-end e Back-end.

---

## 2. Especialista Front-end (`fono-frontend-specialist`)
* **Referência:** **Seção 6.1 do Manual Técnico**
* **Escopo:** `apps/web` (React + Vite) e `apps/mobile` (React Native).
* **Padrões de Interface:**
  * Paleta clínica em tons **Azul/Teal** via variáveis CSS, com suporte a **Light/Dark mode**.
  * Tipografia oficial: `Inter`.
  * Acessibilidade: Conformidade rigorosa com **WCAG AA** (contraste, foco visível, navegação por teclado).
  * Arquitetura **Feature-based** (`src/features/<dominio>/`).
  * Tratamento obrigatório dos 3 estados visuais em requisições assíncronas:
    * **Loading:** `Skeleton` estrutural.
    * **Empty:** `EmptyState` com ação orientativa.
    * **Error:** `Toast` contextual ou `ErrorBoundary` com opção de retry.
* **Guardrails Inegociáveis (Front-end):**
  * ❌ **NUNCA** fazer chamadas HTTP soltas (`fetch` ou `axios`) dentro de componentes React — isolar em `services` e custom hooks do TanStack Query.
  * ❌ **NUNCA** confiar em permissões (`role`), `userId` ou tokens salvos em `localStorage`/`sessionStorage` para segurança real.
  * ❌ **NUNCA** criar formulários fora do padrão `react-hook-form` + schema Zod compartilhado (`packages/shared`).
  * ❌ **NUNCA** remover atributos de acessibilidade (`aria-*`) dos primitivos Radix UI/shadcn.

---

## 3. Especialista Back-end & Database (`fono-backend-specialist`)
* **Referência:** **Seção 6.2 e Seções 1, 2 e 3 do Manual Técnico**
* **Escopo:** `apps/api` (NestJS) e banco de dados PostgreSQL com Prisma ORM.
* **Padrões de Arquitetura:**
  * **Defesa em profundidade:** O Firebase gerencia exclusivamente o login; o **PostgreSQL é a única fonte de verdade** para permissões (`role`), `userId` e dados de negócio.
  * **Princípio do Menor Privilégio (PMP / IDOR):** Toda busca de pacientes e prontuários **DEVE** filtrar pelo `profissionalId` autenticado no banco (`@CurrentUser()`).
  * DTOs validados via `nestjs-zod` (`ZodValidationPipe`) importando de `packages/shared`.
  * Rate Limiting com `@nestjs/throttler` (global de 100 req/min e 10 req/min para autenticação).
* **GUARDRAILS CRÍTICOS INEGOCIÁVEIS (NUNCA APAGAR DADOS DO BANCO):**
  * 🛑 **PROIBIÇÃO TOTAL DE COMANDOS DESTRUTIVOS NO BANCO:**
    * **NUNCA** executar comandos SQL destrutivos como `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, `DROP COLUMN` ou deletes massivos sem WHERE parametrizado.
    * **NUNCA** rodar comandos CLI destrutivos como `prisma migrate reset`, `prisma db push --force-reset` ou equivalentes.
    * **Preservação de Dados de Saúde:** A exclusão de pacientes, prontuários e registros de negócio deve utilizar obrigatoriamente **Soft Delete** (`deletedAt: DateTime?`, `status: 'INACTIVE'`) para integridade histórica e conformidade com regulação médica.
  * 🛑 **Consultas Seguras:** **NUNCA** utilizar `$queryRawUnsafe` ou `$executeRawUnsafe`.
  * 🛑 **Privacidade em Logs:** **NUNCA** enviar senhas, tokens ou dados sensíveis para o Axiom.
