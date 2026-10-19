# Feature Specification: Fundação do Monorepo (web, api, mobile + contratos compartilhados)

**Feature Branch**: `001-monorepo-setup`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Preciso iniciar agora o monorepo utilizando turborepo, pnpm, teremos três
workspaces: web, api e mobile. Cada um terá seu pipeline e compartilhará contracts entre si como
descrito na constituição."

## User Scenarios & Testing *(mandatory)*

> Os "usuários" desta feature são os desenvolvedores e agentes automatizados do Projeto Fono.

### User Story 1 - Preparar o ambiente com um único comando (Priority: P1)

Um desenvolvedor clona o repositório e, com um único comando de instalação na raiz, obtém todas as
dependências das três aplicações (web, api, mobile) e do pacote de contratos compartilhados, prontas
para desenvolvimento.

**Why this priority**: Sem uma base instalável e consistente, nenhuma outra feature pode começar.

**Independent Test**: Em uma máquina limpa, clonar o repositório, executar a instalação na raiz e
verificar que os quatro workspaces são reconhecidos e iniciam em modo de desenvolvimento.

**Acceptance Scenarios**:

1. **Given** um clone limpo do repositório, **When** o desenvolvedor executa a instalação na raiz,
   **Then** todas as dependências de todos os workspaces são instaladas sem etapas manuais extras.
2. **Given** o ambiente instalado, **When** o desenvolvedor executa o comando de desenvolvimento na
   raiz, **Then** web e api sobem localmente e o mobile pode ser iniciado em emulador/dispositivo.
3. **Given** o ambiente instalado, **When** o desenvolvedor executa o comando de desenvolvimento de
   apenas um workspace, **Then** somente esse workspace (e suas dependências internas) é iniciado.

---

### User Story 2 - Contratos compartilhados como fonte única de verdade (Priority: P1)

Um desenvolvedor define um contrato (schema de validação + tipo) uma única vez no pacote
compartilhado e o consome em web, api e mobile. Uma alteração incompatível no contrato é detectada
automaticamente em todos os consumidores.

**Why this priority**: É exigência direta da Constituição (Princípio I) e evita divergência entre
cliente e servidor.

**Independent Test**: Criar um contrato de exemplo, consumi-lo nos três apps e alterar um campo;
a checagem de tipos deve falhar nos apps que usam o campo antigo.

**Acceptance Scenarios**:

1. **Given** um contrato de exemplo no pacote compartilhado, **When** web, api e mobile o importam,
   **Then** todos recebem o mesmo tipo e a mesma validação em tempo de execução.
2. **Given** um contrato alterado de forma incompatível, **When** a checagem de tipos roda,
   **Then** ela falha apontando os consumidores afetados.
3. **Given** um app tentando importar código de outro app diretamente, **When** o lint roda,
   **Then** a importação é rejeitada (apps só compartilham via pacotes).

---

### User Story 3 - Pipeline de qualidade independente por workspace (Priority: P2)

Ao abrir um Pull Request, cada workspace afetado executa seu próprio pipeline (lint + tipos, build,
testes; migrations na api). Workspaces não afetados pela mudança são ignorados ou reaproveitam
resultados em cache.

**Why this priority**: Garante os quality gates da Constituição (Princípio IV) sem desperdiçar tempo
de CI conforme o repositório cresce.

**Independent Test**: Abrir um PR alterando apenas o web e verificar que só o pipeline do web (e do
que depende dele) é executado; abrir outro alterando o pacote de contratos e verificar que os três
apps são validados.

**Acceptance Scenarios**:

1. **Given** um PR que altera apenas o web, **When** o CI roda, **Then** apenas as tarefas do web
   são executadas; api e mobile são pulados ou servidos do cache.
2. **Given** um PR que altera o pacote de contratos, **When** o CI roda, **Then** web, api e mobile
   são todos validados.
3. **Given** qualquer etapa obrigatória falhando, **When** o CI termina, **Then** o merge é bloqueado.
4. **Given** uma mudança no schema de banco da api, **When** o CI roda, **Then** a etapa de
   validação de migrations é executada e bloqueia migrations destrutivas não autorizadas.

---

### User Story 4 - Configurações e padrões compartilhados (Priority: P3)

Regras de lint, formatação e configuração de TypeScript estrito são definidas uma vez e herdadas por
todos os workspaces, garantindo padrão uniforme.

**Why this priority**: Reduz duplicação e drift, mas o projeto funciona sem isso no primeiro dia.

**Independent Test**: Introduzir um `any` explícito em cada workspace e confirmar que o lint falha
em todos com a mesma regra.

**Acceptance Scenarios**:

1. **Given** uma violação de regra compartilhada (ex.: `any`), **When** o lint roda em qualquer
   workspace, **Then** a mesma violação é reportada.

---

### Edge Cases

- Versão incorreta do Node ou do gerenciador de pacotes: a instalação deve falhar com mensagem
  clara indicando a versão exigida.
- Uso de outro gerenciador de pacotes (npm/yarn): deve ser bloqueado para evitar lockfiles
  divergentes.
- Dependência circular entre pacotes internos: deve ser detectada e falhar o build.
- Variáveis de ambiente ausentes ou inválidas: a aplicação deve recusar inicializar com erro claro
  (sem expor valores secretos).
- Cache de CI corrompido ou desatualizado: deve ser possível executar o pipeline sem cache.
- Contrato compartilhado contendo dependência exclusiva de plataforma (ex.: só Node): deve ser
  impedido, pois o pacote precisa rodar em web, api e mobile.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O repositório MUST conter os workspaces `apps/web`, `apps/api`, `apps/mobile` e
  `packages/shared`, gerenciados por pnpm workspaces e orquestrados por Turborepo.
- **FR-002**: Um único comando de instalação na raiz MUST instalar as dependências de todos os
  workspaces.
- **FR-003**: O repositório MUST exigir versões fixas de Node e pnpm e bloquear outros gerenciadores.
- **FR-004**: `packages/shared` MUST ser a única origem de contratos (schemas Zod, DTOs e tipos
  inferidos) consumidos por web, api e mobile.
- **FR-005**: `packages/shared` MUST ser agnóstico de plataforma (executável em navegador, Node e
  React Native), sem dependências de UI ou de servidor.
- **FR-006**: Apps MUST NOT importar código diretamente de outros apps; compartilhamento ocorre
  apenas por pacotes em `packages/`.
- **FR-007**: Cada workspace MUST expor as tarefas padronizadas `dev`, `lint`, `typecheck`, `build`
  e `test`; a api MUST expor adicionalmente a validação de migrations.
- **FR-008**: As tarefas MUST respeitar o grafo de dependências (ex.: `packages/shared` é construído
  antes dos apps que o consomem).
- **FR-009**: O CI MUST executar, em todo PR, apenas os pipelines dos workspaces afetados e de seus
  dependentes, com cache de resultados.
- **FR-010**: Cada app MUST ter seu pipeline identificável separadamente no CI (status por app).
- **FR-011**: Falha em qualquer etapa obrigatória MUST bloquear o merge.
- **FR-012**: Configurações de TypeScript estrito, lint e formatação MUST ser compartilhadas e
  herdadas por todos os workspaces, com proibição de `any`.
- **FR-013**: Cada app MUST validar suas variáveis de ambiente na inicialização via schema e
  nenhum segredo MUST ser versionado (apenas arquivos de exemplo).
- **FR-014**: Cada app MUST incluir um exemplo mínimo funcional ("hello") consumindo um contrato de
  `packages/shared`, servindo como prova da integração.
- **FR-015**: O repositório MUST documentar no README os comandos de instalação, desenvolvimento,
  testes e build.

### Key Entities

- **Workspace**: unidade do monorepo (app ou pacote) com nome, tipo (app/pacote), tarefas e
  dependências internas.
- **Contrato compartilhado**: definição única de schema + tipo de um dado trocado entre clientes e
  servidor.
- **Pipeline**: conjunto ordenado de tarefas de qualidade executadas por workspace no CI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um novo desenvolvedor sai do clone para os apps rodando localmente em menos de
  15 minutos seguindo apenas o README.
- **SC-002**: 100% dos contratos usados por mais de um app vêm do pacote compartilhado (zero
  duplicação detectada em revisão).
- **SC-003**: Uma alteração incompatível de contrato é detectada em 100% dos apps afetados antes
  do merge.
- **SC-004**: Um PR que altera apenas um app executa somente o pipeline desse app (e dependentes),
  reduzindo o tempo de CI em pelo menos 50% em relação a executar tudo.
- **SC-005**: Execuções repetidas sem mudanças concluem em menos de 1 minuto graças ao cache.
- **SC-006**: Nenhum segredo é encontrado no histórico do repositório por varredura automatizada.

## Assumptions

- **Mobile**: será React Native com Expo e TypeScript, consumindo `packages/shared`. A Constituição
  v2.0.0 ainda não cita `apps/mobile`; recomenda-se emenda MINOR (v2.1.0) para incluí-lo na
  estrutura, stack e guardrails.
- Cada app terá um job/status próprio no GitHub Actions, com detecção de workspaces afetados via
  Turborepo; um pipeline unificado com filtros atende a "cada um terá seu pipeline".
- Deploy, provisionamento de banco/Firebase e features de negócio estão fora do escopo; esta
  feature entrega apenas a fundação (esqueletos funcionais).
- Cache remoto do Turborepo é opcional nesta fase; cache local + cache do CI são suficientes.
- Pacotes de configuração compartilhada (TS/ESLint) poderão residir em `packages/` adicionais,
  além de `packages/shared`.
