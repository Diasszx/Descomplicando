# Guia Rápido de Validação: Autenticação e Login com Firebase Auth

**Feature**: `002-firebase-auth-login`  
**Data**: 2026-11-21  
**Artefatos Relacionados**: [spec.md](./spec.md) | [data-model.md](./data-model.md) | [Contratos API](./contracts/auth-api.md) | [Contratos Web](./contracts/web-routes-and-session.md)

Este guia descreve os pré-requisitos, comandos de verificação automatizada e o roteiro de validação funcional/QA para confirmar o funcionamento ponta a ponta do módulo de autenticação (escopo **API + Web**).

---

## 1. Pré-requisitos de Ambiente

- **Node.js**: `>= 22` (`.nvmrc`)
- **pnpm**: `10.30.3` (`corepack enable`)
- **PostgreSQL**: instância 16+ acessível via `DATABASE_URL`
- **Firebase Authentication**: projeto configurado com provedor **E-mail/Senha** habilitado (ou **Firebase Auth Emulator** local para desenvolvimento e testes sem tráfego externo)
- **Aplicativo Autenticador (QA manual MFA)**: Google Authenticator, Authy ou equivalente compatível com TOTP (RFC 6238)

---

## 2. Configuração de Variáveis de Ambiente

> Consulte os arquivos `.env.example` de cada workspace após a implementação e **nunca** versione segredos reais no Git.

### `apps/api/.env`
- `PORT`, `DATABASE_URL`, `CORS_ORIGINS` (base já existente em `apps/api/.env.example`)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (credenciais da Service Account para o Firebase Admin SDK)
- `FIREBASE_AUTH_EMULATOR_HOST` (opcional em desenvolvimento/testes, ex.: `127.0.0.1:9099`)
- `MFA_ENCRYPTION_KEY` (chave de 32 bytes em hex/base64 para cifragem AES-256-GCM dos segredos TOTP)

### `apps/web/.env`
- `VITE_API_URL` (base já existente)
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_AUTH_EMULATOR_URL` (opcional em desenvolvimento/testes, ex.: `http://127.0.0.1:9099`)

---

## 3. Setup e Validação Automatizada

Execute na raiz do monorepo após a conclusão das tarefas de implementação:

1. **Instalar dependências e gerar build dos contratos compartilhados (`@fono/shared`)**:
   ```powershell
   pnpm install --frozen-lockfile
   pnpm --filter @fono/shared build
   pnpm --filter @fono/shared test
   ```
   *Esperado*: compilação ESM/CJS/d.ts limpa e 100% dos testes unitários dos schemas Zod (`PasswordSchema`, `SyncAuthRequestSchema`, `TotpCodeSchema`, etc.) aprovados.

2. **Validar e aplicar migrations do Prisma (`@fono/api`)**:
   ```powershell
   pnpm --filter @fono/api db:generate
   pnpm --filter @fono/api db:validate
   pnpm --filter @fono/api db:migrate:deploy
   ```
   *Esperado*: validação sem erros, nenhuma instrução SQL destrutiva detectada e tabelas `users` e `user_mfa_sessions` criadas no PostgreSQL conforme [data-model.md](./data-model.md).

3. **Executar testes unitários, de integração HTTP (E2E) e build da API**:
   ```powershell
   pnpm --filter @fono/api lint
   pnpm --filter @fono/api typecheck
   pnpm --filter @fono/api test
   pnpm --filter @fono/api test:e2e
   pnpm --filter @fono/api build
   ```
   *Esperado*: cobertura verde para `AuthService`, `TotpService`, `FirebaseAuthGuard`, `SessionReadyGuard`, `RolesGuard`, respostas `401`/`403`/`409`/`429` no Supertest e redação de campos sensíveis no `StructuredLoggerService`.

4. **Executar testes, lint, typecheck e build da Web (`@fono/web`)**:
   ```powershell
   pnpm --filter @fono/web lint
   pnpm --filter @fono/web typecheck
   pnpm --filter @fono/web test
   pnpm --filter @fono/web build
   ```
   *Esperado*: cobertura verde para formulários (`Login`, `Register`, `ForgotPassword`, `ForcePasswordChange`, `MfaSetup`, `MfaVerify`), guards de rota por perfil e hook `useSessionTimeout` entre abas.

5. **Executar o pipeline completo do monorepo (espelhando o CI)**:
   ```powershell
   pnpm ci
   ```
   *Esperado*: todas as etapas (`lint`, `typecheck`, `build`, `test`, `db:validate`) concluem com código `0`.

---

## 4. Execução Local para QA Ponta a Ponta

Suba a API e o frontend Web (e opcionalmente o Firebase Auth Emulator):

```powershell
pnpm --filter @fono/api dev
pnpm --filter @fono/web dev
```

---

## 5. Roteiro de Validação Manual / QA (Cenários da Spec)

| Cenário | Passos Principais | Resultado Esperado (Critério) |
| :--- | :--- | :--- |
| **1. Cadastro Autônomo e E-mail Duplicado (`US3`, `FR-002`, `FR-006`)** | Acessar `/cadastro`, testar senha inválida (ex.: `abc1234` ou `abcdefgh`), depois cadastrar com senha válida (`>= 8`, maiúscula e minúscula). Repetir o cadastro com o mesmo e-mail. | Validação bloqueia senhas fracas em PT-BR; cadastro válido envia verificação e encaminha para `/verificar-email`; tentativa repetida exibe explicitamente que o **e-mail já está cadastrado**. |
| **2. Verificação de E-mail e Acesso `AUTONOMO` (`US1`, `US3`, `SC-001`, `SC-004`)** | Confirmar o link de verificação de e-mail e clicar em *"Já confirmei meu e-mail"* (ou logar novamente em `/login`). Tentar navegar manualmente para `/admin` ou `/profissional`. | Acesso ao `/dashboard` é liberado em menos de 5s; tentativas de abrir `/admin` ou `/profissional` redirecionam imediatamente de volta para `/dashboard`. |
| **3. Primeiro Acesso `PACIENTE` (`US1`, `FR-007`, `SC-004`)** | Fazer login com conta `PACIENTE` criada com senha temporária (`mustChangePassword = true`). Tentar navegar direto para `/paciente` antes de concluir a troca. | Sistema retém o usuário em `/primeiro-acesso/nova-senha`; após definir nova senha válida e enviar, redireciona para `/paciente`. |
| **4. Setup e Desafio MFA TOTP para `PROFISSIONAL` / `ADMIN` (`US2`, `FR-005`, `SC-003`)** | Fazer login com usuário `PROFISSIONAL` sem MFA ativo. Escanear QR Code em `/mfa/configurar` e validar código de 6 dígitos. Em seguida sair e logar novamente. | Primeiro acesso exige configuração completa do TOTP; segundo login exige `/mfa/verificar` com código do app autenticador antes de liberar `/profissional` (ou `/admin`). |
| **5. Bloqueio de Acesso Indevido e Reset de MFA (`FR-003`, `SC-002`)** | Tentar chamar endpoints protegidos com token inválido, com conta `INACTIVE` ou antes de validar TOTP. Testar também o reset de MFA por um usuário `ADMIN`. | Requisições sem sessão `READY` retornam `401`/`403` conforme [auth-api.md](./contracts/auth-api.md); após reset pelo `ADMIN`, o profissional volta ao fluxo `/mfa/configurar`. |
| **6. Recuperação de Senha Neutra (`US4`, `FR-008`)** | Solicitar recuperação em `/recuperar-senha` com e-mail existente e com e-mail inexistente. | Ambos retornam exatamente a mesma mensagem neutra de confirmação sem vazar existência da conta. |
| **7. Logout e Timeout de 30 min entre Abas (`US4`, `FR-009`, `FR-010`, `SC-005`)** | Abrir duas abas autenticadas no mesmo navegador. Em uma aba clicar em **Sair / Logout** (e em outro teste aguardar o vencimento de 30 min sem atividade, validado também com clock simulado em teste automatizado). | Ambas as abas encerram a sessão e redirecionam para `/login` em menos de 2 segundos; nenhuma chave sensível (token, `role`, `userId`) aparece em `localStorage`/`sessionStorage`. |
| **8. Auditoria de Logs (`FR-014`, `SC-007`)** | Inspecionar a saída JSON do `StructuredLoggerService` após executar os fluxos de login, erro de validação e setup MFA. | Nenhuma senha, token Bearer, código TOTP ou `otpauthUri` aparece em texto plano nos logs (campos redigidos como `[REDACTED]`). |
