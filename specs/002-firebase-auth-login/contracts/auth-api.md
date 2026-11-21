# Contrato da API REST de Autenticação (`apps/api`)

**Feature**: `002-firebase-auth-login`  
**Base Controller**: `AuthController` (`/auth`)  
**Validação de Entrada**: `ZodValidationPipe` (`nestjs-zod`) consumindo `@fono/shared`  
**Proteção Global**: `Helmet` + CORS allowlist + `ThrottlerGuard` (100 req/min global; **10 req/min** nas rotas de autenticação)

---

## 1. Guards e Decorators Reutilizáveis

| Componente | Responsabilidade | Comportamento em Falha |
| :--- | :--- | :--- |
| `FirebaseAuthGuard` | Extrai `Authorization: Bearer <idToken>`, valida assinatura e revogação via `FirebaseAdminService.verifyIdToken(token, true)` (`checkRevoked: true`) e resolve o usuário interno por `firebaseUid` no PostgreSQL. | `401 INVALID_TOKEN` (ausente/expirado/inválido), `401 TOKEN_REVOKED` (sessão revogada), `403 ACCOUNT_INACTIVE` (status `INACTIVE` ou `deletedAt != null`). |
| `SessionReadyGuard` | Verifica `nextStep === 'READY'` para o usuário e `auth_time` da requisição atual. Ignorado automaticamente em rotas marcadas com `@AllowPendingSession()`. | `403 EMAIL_NOT_VERIFIED`, `403 PASSWORD_CHANGE_REQUIRED`, `403 MFA_SETUP_REQUIRED` ou `403 MFA_VERIFICATION_REQUIRED`. |
| `RolesGuard` | Compara `user.role` (do PostgreSQL) com os papéis exigidos pelo decorator `@Roles(...)`. | `403 FORBIDDEN_ROLE` quando o perfil não tem permissão. |
| `@CurrentUser()` | Decorator de parâmetro que injeta o usuário interno verificado (`CurrentAuthUser` com `id`, `role`, `firebaseUid`, `firebaseAuthTime`, `emailVerified`, `nextStep`), jamais aceitando dados do body/query. | — |
| `@AllowPendingSession()` | Metadata decorator usado apenas em rotas do próprio fluxo de onboarding/autenticação (`/auth/sync`, `/auth/me`, `/auth/password-changed`, `/auth/mfa/*`, `/auth/logout`). | — |
| `@AllowUnlinkedSync()` | Metadata decorator exclusivo de `POST /auth/sync` permitindo que `FirebaseAuthGuard` valide o ID Token antes da criação/vinculação inicial do `User` no PostgreSQL. | — |

> **Observação sobre `/health`**: `HealthController` permanece público (`@Public()` / sem `FirebaseAuthGuard`) para probes de infraestrutura.

---

## 2. Endpoints da API

### 2.1 `POST /auth/sync`
Sincroniza de forma idempotente a identidade autenticada no Firebase Authentication com a tabela `users` no PostgreSQL (`FR-003`, `FR-004`, `R-03`).

- **Guards**: `FirebaseAuthGuard` (modo sincronização: aceita token válido ainda sem registro vinculado por `firebaseUid`) + `@AllowPendingSession()`
- **Rate Limit**: `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- **Headers**: `Authorization: Bearer <firebase_id_token>`
- **Request Body** (`SyncAuthRequestSchema.strict()`):
  ```json
  {
    "name": "Maria Silva"
  }
  ```
- **Fluxo e Regras**:
  1. Verifica token com `checkRevoked: true`.
  2. Busca `User` por `firebaseUid`:
     - Se existir e `status === 'INACTIVE'` ou `deletedAt != null` → `403 ACCOUNT_INACTIVE`.
     - Se existir e ativo → atualiza `emailVerified` se o token trouxer `email_verified: true` e atualiza `lastLoginAt`.
  3. Se não existir por `firebaseUid`, busca `User` por `email` (do token verificado, em lowercase):
     - Se existir com outro `firebaseUid != null` → `409 EMAIL_ALREADY_REGISTERED`.
     - Se existir pré-cadastro com `firebaseUid == null` e `decodedToken.email_verified !== true` → `403 EMAIL_NOT_VERIFIED` (previne *pre-account takeover*).
     - Se existir pré-cadastro com `firebaseUid == null` e `decodedToken.email_verified === true` → vincula `firebaseUid`, mantém `role` e `mustChangePassword` do pré-cadastro, atualiza `emailVerified = true` e `lastLoginAt`.
  4. Se não existir nenhum registro → cria novo `User` com `role = AUTONOMO`, `status = ACTIVE`, `mustChangePassword = false`.
- **Response `200 OK`** (`AuthSessionResponseSchema`):
  ```json
  {
    "user": {
      "id": "uuid",
      "name": "Maria Silva",
      "email": "maria@exemplo.com",
      "emailVerified": true,
      "role": "AUTONOMO",
      "status": "ACTIVE",
      "mustChangePassword": false,
      "mfaRequired": false,
      "mfaEnabled": false,
      "lastLoginAt": "2026-11-21T16:00:00.000Z"
    },
    "nextStep": "READY",
    "mfaVerifiedForCurrentLogin": false
  }
  ```

---

### 2.2 `GET /auth/me`
Retorna o perfil atualizado e o estado `nextStep` da sessão atual (`FR-003`, `FR-011`).

- **Guards**: `FirebaseAuthGuard` + `@AllowPendingSession()`
- **Rate Limit**: 100 req/min global (leitura de estado de sessão)
- **Response `200 OK`**: `AuthSessionResponseSchema`
- **Erros**: `401 INVALID_TOKEN`, `401 TOKEN_REVOKED`, `403 ACCOUNT_INACTIVE`

---

### 2.3 `POST /auth/password-changed`
Confirma que o usuário (`PACIENTE` em primeiro acesso) concluiu a troca obrigatória da senha temporária no provedor de identidade (`FR-007`).

- **Guards**: `FirebaseAuthGuard` + `@AllowPendingSession()`
- **Rate Limit**: `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- **Pré-condição**:
  - `user.emailVerified === true` (caso contrário `403 EMAIL_NOT_VERIFIED`).
  - O cliente deve renovar o ID Token (`getIdToken(true)`) após `updatePassword` no Firebase antes de acionar este endpoint.
- **Verificação Server-Side (`FR-007`)**:
  - O backend consulta `FirebaseAdminService.getUser(user.firebaseUid)` e verifica que `tokensValidAfterTime` (atualizado pelo Firebase Authentication na alteração de senha) é estritamente posterior ao registro prévio de criação/último acesso anterior à troca (`user.passwordChangedAt ?? user.createdAt`).
  - Se não houver evidência de troca real de senha no provedor, mantém `mustChangePassword = true` e retorna `403 PASSWORD_CHANGE_REQUIRED`.
- **Efeito**: atualiza `mustChangePassword = false` e `passwordChangedAt = now()`.
- **Response `200 OK`**: `AuthSessionResponseSchema` recalculado (`nextStep` atualizado para `MFA_SETUP`, `MFA_VERIFY` ou `READY`).

---

### 2.4 `POST /auth/mfa/setup`
Gera um novo segredo TOTP temporário (`mfaPendingSecretEncrypted`) cifrado com AES-256-GCM e retorna os dados para o aplicativo autenticador (`FR-005`, `R-02`).

- **Guards**: `FirebaseAuthGuard` + `@AllowPendingSession()`
- **Rate Limit**: `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- **Pré-condições**:
  - `user.emailVerified === true` (senão `403 EMAIL_NOT_VERIFIED`)
  - `user.mustChangePassword === false` (senão `403 PASSWORD_CHANGE_REQUIRED`)
  - **`user.mfaEnabled === false`** (senão `403 MFA_VERIFICATION_REQUIRED` — impede sobrescrita ou bypass de um segundo fator já ativo; nova vinculação só ocorre após reset explícito via `POST /auth/admin/users/:userId/mfa/reset`).
- **Efeito**: gera segredo Base32 criptograficamente aleatório (160 bits), cifra e grava em `mfaPendingSecretEncrypted` sem alterar `mfaEnabled`.
- **Response `200 OK`** (`MfaSetupResponseSchema`):
  ```json
  {
    "otpauthUri": "otpauth://totp/FonoGames:profissional%40exemplo.com?secret=...&issuer=FonoGames",
    "manualEntryKey": "JBSWY3DPEHPK3PXP...",
    "issuer": "FonoGames",
    "accountName": "profissional@exemplo.com"
  }
  ```

---

### 2.5 `POST /auth/mfa/verify`
Valida o código TOTP de 6 dígitos informado pelo usuário (tanto na ativação inicial quanto no desafio de login) e libera a sessão MFA para o `auth_time` atual (`FR-005`, `R-02`).

- **Guards**: `FirebaseAuthGuard` + `@AllowPendingSession()`
- **Rate Limit**: `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- **Request Body** (`TotpCodeSchema`):
  ```json
  {
    "code": "123456"
  }
  ```
- **Pré-condições**:
  - `user.emailVerified === true`
  - `user.mustChangePassword === false`
- **Fluxo e Regras**:
  1. Seleciona a fonte do segredo de forma mutuamente exclusiva: `mfaPendingSecretEncrypted` **somente** quando `user.mfaEnabled === false` (ativação inicial), ou `mfaSecretEncrypted` **exclusivamente** quando `user.mfaEnabled === true` (desafio de sessão).
  2. Decifra o segredo em memória com AES-256-GCM.
  3. Valida o código TOTP (RFC 6238, 6 dígitos, período 30s, janela ±1 passo) e confere anti-replay (`matchedStep > user.mfaLastUsedStep` quando `mfaLastUsedStep != null`).
  4. Em caso inválido/reutilizado → `400 INVALID_TOTP_CODE` (`"Código de verificação inválido ou expirado."`).
  5. Em transação Prisma:
     - Se `!user.mfaEnabled` (`mfaPendingSecretEncrypted` presente), promove para `mfaSecretEncrypted`, limpa `mfaPendingSecretEncrypted`, define `mfaEnabled = true` e `mfaEnrolledAt = now()`.
     - Atualiza `mfaLastUsedStep = matchedStep`.
     - Executa `upsert` em `user_mfa_sessions` para `(userId, decodedToken.auth_time)` com `revokedAt = null` e `verifiedAt = now()`.
- **Response `200 OK`**: `AuthSessionResponseSchema` com `nextStep: 'READY'` e `mfaVerifiedForCurrentLogin: true`.

---

### 2.6 `POST /auth/logout`
Encerra a sessão no servidor revogando sessões MFA ativas e tokens de atualização no Firebase (`FR-009`, `FR-010`).

- **Guards**: `FirebaseAuthGuard` + `@AllowPendingSession()`
- **Rate Limit**: `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- **Efeito**:
  - Marca `revokedAt = now()` em todas as linhas de `user_mfa_sessions` com `revokedAt IS NULL` do usuário.
  - Invoca `firebaseAdmin.revokeRefreshTokens(user.firebaseUid)` (best-effort caso emulador/provedor já tenha invalidado).
- **Response**: `204 No Content`

---

### 2.7 `POST /auth/admin/users/:userId/mfa/reset`
Redefine o vínculo de MFA TOTP de um usuário (cobre o edge case de perda do aplicativo autenticador por `ADMIN` ou `PROFISSIONAL`).

- **Guards**: `FirebaseAuthGuard` + `SessionReadyGuard` + `RolesGuard` (`@Roles('ADMIN')`)
- **Rate Limit**: `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- **Params**: `userId` (UUID válido)
- **Efeito**:
  - Limpa `mfaEnabled = false`, `mfaSecretEncrypted = null`, `mfaPendingSecretEncrypted = null`, `mfaEnrolledAt = null`, `mfaLastUsedStep = null`.
  - Revoga todas as `UserMfaSession` ativas do usuário alvo e chama `firebaseAdmin.revokeRefreshTokens(target.firebaseUid)`.
  - Registra evento de auditoria estruturado (apenas `actorUserId`, `targetUserId`, timestamp — sem segredos).
- **Response `200 OK`**: `AdminResetMfaResponseSchema`

---

## 3. Catálogo de Erros Estruturados (`ApiErrorResponseSchema`)

| HTTP Status | `code` | Mensagem Padrão (PT-BR) | Quando Ocorre |
| :--- | :--- | :--- | :--- |
| `401` | `INVALID_TOKEN` | `"Sessão inválida ou expirada. Faça login novamente."` | Header ausente, malformado ou token inválido/expirado |
| `401` | `TOKEN_REVOKED` | `"Sua sessão foi encerrada. Faça login novamente."` | Token revogado detectado por `checkRevoked: true` |
| `403` | `ACCOUNT_INACTIVE` | `"Esta conta está inativa ou foi desativada. Entre em contato com o suporte."` | `status === 'INACTIVE'` ou `deletedAt != null` |
| `403` | `EMAIL_NOT_VERIFIED` | `"Confirme seu endereço de e-mail antes de acessar o sistema."` | `emailVerified === false` |
| `403` | `PASSWORD_CHANGE_REQUIRED` | `"É necessário definir uma nova senha pessoal antes de continuar."` | `mustChangePassword === true` |
| `403` | `MFA_SETUP_REQUIRED` | `"Configure a autenticação em duas etapas (TOTP) para continuar."` | `ADMIN`/`PROFISSIONAL` sem MFA configurado |
| `403` | `MFA_VERIFICATION_REQUIRED` | `"Informe o código do aplicativo autenticador para concluir o acesso."` | `mfaEnabled === true` sem `UserMfaSession` para o `auth_time` |
| `403` | `FORBIDDEN_ROLE` | `"Você não tem permissão para acessar este recurso."` | Perfil divergente do exigido por `@Roles(...)` |
| `409` | `EMAIL_ALREADY_REGISTERED` | `"Este e-mail já está cadastrado na plataforma."` | Tentativa de vincular e-mail já associado a outro `firebaseUid` |
| `400` | `INVALID_TOTP_CODE` | `"Código de verificação inválido ou expirado."` | Código TOTP incorreto ou reutilizado no mesmo passo |
| `429` | `TOO_MANY_REQUESTS` | `"Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente."` | Limite de 10 req/min excedido (`@nestjs/throttler`) |
