# Manual de Operação dos Agentes — FonoGames

Este documento consolida a estrutura, responsabilidades e os **guardrails de segurança** implementados no ambiente de desenvolvimento com base na **Constituição da FonoGames** e no Manual Técnico.

### Modelos de Atuação e Perfis
- **Modelo Fonoaudiológico:** Gestão clínica de pacientes, prescrição de jogos terapêuticos e comutação de contexto (perfil de teste próprio do fonoaudiólogo vs contexto do paciente selecionado para gravação direta no prontuário).
- **Modelo Autônomo:** Uso por pessoa comum com acesso ao catálogo completo de jogos e progresso pessoal, sem permissões clínicas.
- **Perfis Oficiais:** `ADMIN`, `PROFISSIONAL`, `PACIENTE` e `AUTONOMO`.

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
* **Referência:** **Seção 6.1 do Manual Técnico** e Skill canônica [`fono-ui-design-system`](file:///.agents/skills/fono-ui-design-system/SKILL.md).
* **Escopo:** `apps/web` (React + Vite) e `apps/mobile` (React Native).
* **Identidade Visual Oficial (Dashboard & Cards):**
  * **Estrutura Base (Layout Geral):** Fundo suave em off-white (`slate-50`), Sidebar com botões em formato de pílula arredondada (item ativo em tom pastel amarelo/âmbar suave), e cabeçalho com Overview, sininho de notificações e 4 cartões horizontais de métricas/KPIs (Em andamento, Concluídos, Categorias, Conquistas).
  * **Cards de Exercícios/Jogos (Padrão Banner Ilustrado + Hover Dinâmico):**
    * Substituição obrigatória dos antigos cards brancos planos pelos cards com **banner superior ilustrado e temático** (gradientes vibrantes: rosa/coral, verde menta, roxo, azul royal e âmbar).
    * Borda externa `rounded-3xl` (24px) com contêiner interno do banner em `rounded-2xl` (16px).
    * Rodapé do card contendo título em negrito, contagem de atividades/exercícios e botão circular de ação em Teal com ícone de Play.
    * **Efeito Hover Obrigatório:** Elevação suave do card (`-translate-y-2`), expansão de sombra tridimensional (`shadow-xl`), leve zoom na ilustração interna (`scale-108`) e destaque escalonado no botão de Play.
* **Padrões de Interface:**
  * Paleta clínica e amigável em tons **Azul/Teal e acentos temáticos** via variáveis CSS e classes Tailwind.
  * Tipografia oficial: `Inter`.
  * Acessibilidade: Conformidade rigorosa com **WCAG AA** (contraste, foco visível com `focus-visible:ring-2`, navegação por teclado e leitor de telas).
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
  * ❌ **NUNCA** criar cards de jogos como caixas cinzas estáticas — aplicar obrigatoriamente o componente com banner ilustrado e micro-interação de hover.
  * ❌ **NUNCA** exibir propagandas, anúncios de terceiros ou textos de monetização do tipo "sem anúncios" / "remova propagandas" — a plataforma é de saúde e 100% livre de publicidade. Toda comunicação de planos Pro/Clínicos deve enfatizar recursos clínicos (prontuários ilimitados, relatórios com IA e acompanhamento terapêutico).

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
