# Pesquisa e Decisões Arquiteturais: Autenticação e Login com Firebase Auth

**Feature**: `002-firebase-auth-login`  
**Data**: 2026-11-21  
**Spec**: [spec.md](./spec.md)

Este documento consolida todas as decisões técnicas da Fase 0 para o fluxo de autenticação, autorização e gestão de sessão da FonoGames (escopo **API + Web**), garantindo conformidade estrita com a [Constituição v2.3.0](../../.specify/memory/constitution.md) e o [Design System](../../.agents/skills/fono-ui-design-system/SKILL.md).

---

## R-01 — Integração Firebase Authentication (Web SDK Modular + Admin SDK na API)

- **Decision**:
  - Na aplicação Web (`apps/web`), utilizar o SDK modular oficial `firebase` (`firebase/app` e `firebase/auth`) com `browserLocalPersistence` (ou `connectAuthEmulator` quando `VITE_FIREBASE_AUTH_EMULATOR_URL` estiver definida), encapsulado em `apps/web/src/features/auth/services/firebase-auth.service.ts`.
  - Na API (`apps/api`), utilizar `firebase-admin` encapsulado em `FirebaseAdminService` (`apps/api/src/auth/firebase-admin.service.ts`), validando todo Bearer ID Token recebido via `auth().verifyIdToken(token, true)` (**`checkRevoked: true` obrigatório**).
  - Validar todas as variáveis de ambiente via Zod no boot:
    - `apps/api/src/config/env.ts`: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (com normalização de `\n` literais) e `FIREBASE_AUTH_EMULATOR_HOST` (opcional para desenvolvimento/testes).
    - `apps/web/src/lib/env.ts`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` e `VITE_FIREBASE_AUTH_EMULATOR_URL` (opcional para desenvolvimento/testes).
- **Rationale**:
  - Cumpre integralmente o Princípio III da Constituição: Firebase Auth atua exclusivamente como provedor de identidade (login, cadastro, verificação de e-mail, redefinição de senha e emissão de ID Token), enquanto o PostgreSQL mantém a única fonte de verdade para `role`, status e estado clínico.
  - O parâmetro `checkRevoked: true` garante que sessões encerradas administrativamente (`status = INACTIVE`), por logout (`revokeRefreshTokens`) ou por reset de MFA sejam bloqueadas imediatamente na camada de API.
  - O encapsulamento em `FirebaseAdminService` permite injeção de dependência e substituição limpa por mocks ou Firebase Auth Emulator nos testes unitários e E2E (`supertest`) sem credenciais de produção no CI.
- **Alternatives considered**:
  - **`browserSessionPersistence` isolado no Web SDK**: descartado porque abre um contexto separado em cada aba, quebrando a experiência quando um profissional abre outra aba da mesma clínica (exige novo login em cada aba). O risco de persistência em dispositivo compartilhado é mitigado pela sincronização obrigatória de logout e timeout de 30 minutos entre todas as abas (`R-05`).
  - **JWT próprio substituindo Firebase Auth**: rejeitado por violar a Constituição da FonoGames e o requisito explícito da feature.

---

## R-02 — MFA via TOTP (RFC 6238) Gerenciado na API + PostgreSQL Vinculado ao `auth_time`

- **Decision**:
  - Implementar geração de segredos e validação de códigos TOTP (RFC 6238: HMAC-SHA1, 6 dígitos, período de 30 segundos, janela de tolerância ±1 step) no backend (`apps/api`) usando a biblioteca `otpauth`.
  - Cifrar o segredo TOTP em repouso no PostgreSQL com **AES-256-GCM** utilizando a chave `MFA_ENCRYPTION_KEY` (32 bytes em hex ou base64 no `.env`, validada por Zod no boot da API).
  - Durante o setup inicial, gravar primeiro em `mfaPendingSecretEncrypted` e só promover para `mfaSecretEncrypted` (`mfaEnabled = true`) após a validação bem-sucedida do primeiro código TOTP gerado pelo aplicativo autenticador do usuário. Quando `mfaEnabled === true`, `POST /auth/mfa/setup` é bloqueado com `403 MFA_VERIFICATION_REQUIRED` (nova vinculação só é permitida após reset explícito pelo `ADMIN`), impedindo sobrescrita ou bypass de MFA ativo.
  - Aplicar proteção anti-replay armazenando o último passo TOTP aceito em `mfaLastUsedStep` (impedindo reutilização do mesmo código de 6 dígitos na mesma janela).
  - Registrar cada verificação de segundo fator na tabela `user_mfa_sessions` vinculada ao par `(userId, firebaseAuthTime)`, onde `firebaseAuthTime` é extraído da claim `auth_time` do ID Token verificado pelo Firebase Admin.
  - No frontend Web (`apps/web`), renderizar o QR Code a partir de `otpauthUri` com `qrcode.react` (SVG acessível, sem depender de serviço externo de geração de imagem) junto à opção de copiar a `manualEntryKey` para inserção manual em aplicativos autenticadores (Google Authenticator, Authy, Microsoft Authenticator, etc.).
- **Rationale**:
  - **Independência de plano pago no Firebase**: o suporte nativo de TOTP no Firebase Auth exige upgrade obrigatório para o **Google Cloud Identity Platform** (plano Blaze com faturamento ativo) e possui limitações conhecidas no Firebase Auth Emulator local; gerenciando o TOTP no backend + PostgreSQL, o sistema funciona 100% no plano gratuito (Spark), no emulador e em testes E2E no CI.
  - **Segurança equivalente ou superior**: como o vínculo da sessão MFA usa `firebaseAuthTime` (claim assinada pelo Firebase que só muda quando o usuário realiza nova autenticação por senha), todo novo login exige um novo desafio TOTP automaticamente, mesmo com refresh automático do ID Token pelo SDK.
  - **Enforcement centralizado e recuperação administrativa**: o `SessionReadyGuard` impede no servidor qualquer acesso protegido antes da verificação MFA; em caso de perda do celular por `ADMIN` ou `PROFISSIONAL`, um `ADMIN` pode redefinir o MFA via `POST /auth/admin/users/:userId/mfa/reset` com revogação imediata de sessões e refresh tokens.
- **Alternatives considered**:
  - **Firebase Identity Platform TOTP nativo**: rejeitado pelo acoplamento obrigatório a plano faturado no GCP e fricção nos testes locais/CI com emulador.
  - **MFA via SMS**: rejeitado pela especificação (que define TOTP via aplicativo autenticador) além de gerar custo por SMS e vulnerabilidade a *SIM swapping*.

---

## R-03 — Sincronização Idempotente (`POST /auth/sync`) e Prevenção de *Pre-Account Takeover*

- **Decision**:
  - `POST /auth/sync` exige Bearer ID Token válido (`FirebaseAuthGuard` com `checkRevoked: true`) e aceita payload estrito `{ name?: string }` (`SyncAuthRequestSchema.strict()`, rejeitando qualquer campo extra como `role` ou `status`).
  - O backend resolve o cadastro interno na seguinte ordem determinística a partir do token verificado (`decodedToken.uid`, `decodedToken.email`, `decodedToken.email_verified`):
    1. **Busca por `firebaseUid`**:
       - Se encontrado e `deletedAt != null` ou `status === 'INACTIVE'` → retorna `403 Forbidden` (`ACCOUNT_INACTIVE`).
       - Se encontrado e ativo → atualiza `emailVerified` caso tenha mudado para `true` no token, atualiza `lastLoginAt` e retorna `AuthSessionResponse` (fluxo idempotente para logins recorrentes e recuperação de falhas parciais).
    2. **Busca por `email` normalizado (`toLowerCase().trim()`) quando `firebaseUid` ainda não existe**:
       - Se existir registro com **`firebaseUid != null`** (e diferente do `uid` do token) → retorna `409 Conflict` (`EMAIL_ALREADY_REGISTERED`).
       - Se existir pré-cadastro clínico/administrativo com **`firebaseUid == null`** (conta `PROFISSIONAL` ou `PACIENTE` criada internamente):
         - Se `decodedToken.email_verified !== true` → retorna `403 Forbidden` (`EMAIL_NOT_VERIFIED`) **sem vincular** o `firebaseUid`.
         - Se `decodedToken.email_verified === true` → vincula `firebaseUid = decodedToken.uid`, atualiza `emailVerified = true` e `lastLoginAt`, preservando o `role` e `mustChangePassword` definidos no pré-cadastro.
    3. **Nenhum registro encontrado**:
       - Cria usuário com `role = UserRole.AUTONOMO`, `status = UserStatus.ACTIVE`, `mustChangePassword = false`, `emailVerified = Boolean(decodedToken.email_verified)` e `name` sanitizado (fallback seguro para parte local do e-mail caso ausente).
- **Rationale**:
  - Atende `FR-003`, `FR-004`, `FR-006` e o edge case de **sincronização parcial idempotente** (se o usuário foi criado no Firebase e a rede caiu antes do `POST /auth/sync`, o próximo login cria ou recupera o vínculo sem erro de duplicidade).
  - Impede *pre-account takeover* em contas clínicas pré-cadastradas ao exigir `email_verified === true` antes de vincular um `firebaseUid` por correspondência de e-mail.
  - Garante que clientes nunca possam elevar privilégios enviando `role` no body.
- **Alternatives considered**:
  - **Triggers do Firebase (Cloud Functions `beforeCreate`/`onCreate`)**: rejeitado porque criaria código e deploy fora do monorepo NestJS e quebraria a diretriz da Constituição que exige sincronização explícita via `POST /auth/sync`.

---

## R-04 — Máquina de Estados Pós-Login Centralizada (`AuthNextStep`)

- **Decision**:
  - O backend calcula de forma determinística o campo `nextStep: AuthNextStep` em `POST /auth/sync`, `GET /auth/me`, `POST /auth/password-changed` e `POST /auth/mfa/verify`, seguindo exatamente esta ordem de precedência:
    1. `VERIFY_EMAIL`: quando `!user.emailVerified`
    2. `CHANGE_PASSWORD`: quando `user.mustChangePassword === true`
    3. `MFA_SETUP`: quando `(user.role === 'ADMIN' || user.role === 'PROFISSIONAL') && !user.mfaEnabled`
    4. `MFA_VERIFY`: quando `user.mfaEnabled === true` e não existe `UserMfaSession` ativa (`revokedAt == null`) para o par `(user.id, decodedToken.auth_time)`
    5. `READY`: quando todas as etapas aplicáveis foram concluídas
  - Criar `SessionReadyGuard` global/aplicável a módulos protegidos (ignorado apenas via decorator `@AllowPendingSession()` nas rotas do fluxo de conclusão de sessão como `/auth/sync`, `/auth/me`, `/auth/password-changed`, `/auth/mfa/*`, `/auth/logout`), retornando `403` com código específico (`EMAIL_NOT_VERIFIED`, `PASSWORD_CHANGE_REQUIRED`, `MFA_SETUP_REQUIRED` ou `MFA_VERIFICATION_REQUIRED`) se `nextStep !== 'READY'`.
  - No React Router (`apps/web`), o wrapper `AuthRouteGuard` lê exclusivamente o estado de sessão retornado pela API (`useAuthSession`) e redireciona para a rota correspondente a `nextStep` (`/verificar-email`, `/primeiro-acesso/nova-senha`, `/mfa/configurar`, `/mfa/verificar`) ou para o painel do perfil quando `READY`.
- **Rationale**:
  - Fonte única de verdade no backend impede que manipulação de rota no cliente dê acesso a dados ou painéis antes da troca de senha do paciente (`FR-007`) ou do desafio MFA (`FR-005`).
  - Reduz complexidade e evita divergência de regras entre telas.
- **Alternatives considered**:
  - **Flags booleanas independentes interpretadas apenas no frontend**: rejeitado pelo risco de inconsistência entre etapas (ex.: tentar configurar MFA antes de trocar a senha ou verificar e-mail) e vulnerabilidade a chamadas diretas à API.

---

## R-05 — Timeout de 30 Minutos e Sincronização Entre Abas sem Credenciais em Storage

- **Decision**:
  - Implementar hook `useSessionTimeout` em `apps/web/src/features/auth/hooks/use-session-timeout.ts` com constante `SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000` (30 minutos).
  - Sincronizar atividade e encerramento entre todas as abas abertas do navegador via `BroadcastChannel('fono-auth-session')` com fallback automático via evento `window.addEventListener('storage')` utilizando exclusivamente metadados não-sensíveis:
    - Chave de atividade (`fono:auth:activity`): timestamp numérico (`Date.now()`) com throttle (ex.: a cada 15s em eventos de interação `pointerdown`, `keydown`, `scroll`, `focus`).
    - Canal/chave de encerramento (`fono:auth:event`): `{ type: 'LOGOUT' | 'TIMEOUT', timestamp }`.
  - **Garantia estrita de privacidade/guardrail**: nenhuma credencial, ID Token, refresh token customizado, `role` ou `userId` é armazenado ou lido de `localStorage`/`sessionStorage` para autorização.
  - Ao detectar `LOGOUT`, `TIMEOUT` ou expiração local de 30 minutos:
    1. Transmite evento para todas as demais abas (execução imediata < 2s).
    2. Aciona `POST /auth/logout` (best-effort no emissor) e `signOut(auth)`.
    3. Limpa o cache em memória do TanStack Query (`queryClient.clear()`).
    4. Redireciona para `/login` com parâmetro informativo quando for timeout (`?reason=inactivity`).
- **Rationale**:
  - Atende simultaneamente `FR-009`, `FR-010`, `SC-005` e o Guardrail Frontend Web da Constituição (proibição de confiar/persistir `role`, `userId` ou tokens em `localStorage`/`sessionStorage`).
  - Protege computadores compartilhados de clínicas garantindo que o logout ou inatividade em uma aba limpe imediatamente dados em memória de todas as abas abertas.
- **Alternatives considered**:
  - **Timer isolado por aba**: rejeitado porque não propaga logout nem sincroniza atividade real do usuário entre abas.
  - **Polling frequente no servidor**: rejeitado por gerar tráfego desnecessário e não atingir o tempo de reação imediato (< 2s) entre abas sem custo de rede.

---

## R-06 — Política de Senha, Sanitização e Contratos Compartilhados (`packages/shared`)

- **Decision**:
  - Concentrar todos os schemas, enums, tipos e mensagens padrão de validação de autenticação em `packages/shared/src/auth/` (exportados em `packages/shared/src/index.ts`), mantendo `packages/shared` 100% agnóstico de DOM/Node/RN.
  - `PasswordSchema`: string com mínimo de 8 caracteres, máximo de 128 caracteres, regex obrigatória para ao menos 1 letra maiúscula (`/[A-Z]/`) e 1 letra minúscula (`/[a-z]/`), sem usar `.trim()` na senha para não alterar silenciosamente caracteres digitados pelo usuário.
  - Sanitização contra XSS nos transforms Zod para campos textuais: `name` aplica `.trim()`, remove tags HTML (`/<[^>]*>/g`) e normaliza espaços múltiplos; `email` aplica `.trim().toLowerCase()` + validação `.email()`.
  - Consumo obrigatório via `zodResolver` (`react-hook-form`) no `apps/web` e `ZodValidationPipe` (`nestjs-zod`) no `apps/api`.
- **Rationale**:
  - Atende os Princípios I, II e III da Constituição e `FR-002` sem duplicação de contratos nem uso de `any`.
- **Alternatives considered**:
  - **Schemas separados por app**: proibido pela Constituição (Single Source of Truth em `packages/shared`).

---

## R-07 — Rate Limiting e Redação Estrita de Logs

- **Decision**:
  - Manter o limite global de 100 req/min configurado em `AppModule` (`ThrottlerModule`) e aplicar `@Throttle({ default: { limit: 10, ttl: 60000 } })` em nível de classe/rotas sensíveis no `AuthController` (exceto eventualmente quando desabilitado em suites unitárias específicas, mas testado explicitamente em E2E).
  - Expandir `SENSITIVE_KEYS` em `apps/api/src/common/logger/structured-logger.service.ts` para redigir automaticamente: `password`, `newpassword`, `currentpassword`, `confirmpassword`, `token`, `idtoken`, `accesstoken`, `refreshtoken`, `secret`, `mfasecret`, `mfasecretencrypted`, `mfapendingsecretencrypted`, `otpauthuri`, `manualentrykey`, `totp`, `totpcode`, `code`, `authorization`, `cookie`, `firebase_private_key`, `mfa_encryption_key`.
  - Criar filtro/tratamento de exceções seguro para que erros de validação, Firebase Admin ou Prisma nunca devolvam stack traces, segredos ou chaves internas na resposta HTTP nem nos logs enviados ao Axiom.
- **Rationale**:
  - Cumpre os Princípios III e VII da Constituição, `FR-012`, `FR-014` e `SC-007`.
- **Alternatives considered**:
  - **Mascaramento apenas manual por chamada de log**: rejeitado pelo risco de vazamento acidental em logs de erro ou objetos aninhados.

---

## R-08 — Design System, Primitivos shadcn/ui e Rotas Iniciais por Perfil (`apps/web`)

- **Decision**:
  - Manter `apps/web/src/components/ui/` exclusivo para primitivos shadcn/ui adicionando `input.tsx`, `label.tsx` e `alert.tsx` construídos com tokens semânticos (`bg-background`, `bg-card`, `border-input`, `ring-ring`, `text-destructive`, `bg-brand-teal`, `bg-brand-amber`, etc.), zero cores hexadecimais e conformidade WCAG AA (`aria-invalid`, `aria-describedby`, `role="alert"`, `focus-visible:ring-2 focus-visible:ring-ring`).
  - Estruturar toda a funcionalidade em `apps/web/src/features/auth/` (`components/`, `hooks/`, `pages/`, `services/`) isolando chamadas Axios em `services/auth-api.service.ts` + interceptor de Bearer Token em `apps/web/src/lib/api-client.ts`, consumidas via hooks do TanStack Query (`useQuery` / `useMutation`).
  - Configurar `react-router-dom` (`BrowserRouter`) em `apps/web/src/app/` com páginas públicas (`/login`, `/cadastro`, `/recuperar-senha`), páginas de pendência de sessão (`/verificar-email`, `/primeiro-acesso/nova-senha`, `/mfa/configurar`, `/mfa/verificar`) e rotas protegidas dedicadas por perfil (`/admin`, `/profissional`, `/paciente`, `/dashboard`) que renderizam o layout canônico da FonoGames com indicador do perfil autenticado e botão de Logout funcional.
  - Aplicar explicitamente os 3 estados visuais obrigatórios (Loading com `Skeleton`, Empty/Info contextual e Error com feedback acessível + retry) e manter a diretriz estrita de **Zero Anúncios**.
- **Rationale**:
  - Cumpre integralmente o Princípio V da Constituição, os Guardrails Frontend Web e a skill [fono-ui-design-system](../../.agents/skills/fono-ui-design-system/SKILL.md).
- **Alternatives considered**:
  - **Manter apenas `DashboardView` sem roteador**: inviável para separar fluxos públicos de login/cadastro/MFA e isolar rotas protegidas por perfil (`FR-011`, `SC-004`).
