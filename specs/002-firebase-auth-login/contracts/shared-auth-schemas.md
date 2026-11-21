# Contrato de Schemas Compartilhados (`packages/shared`)

**Feature**: `002-firebase-auth-login`  
**Localização**: `packages/shared/src/auth/` (`auth.enums.ts`, `auth.schema.ts`, `index.ts`)  
**Exportação**: reexportado integralmente em `packages/shared/src/index.ts`

Conforme o **Princípio I** e o **Princípio II** da Constituição da FonoGames, todos os contratos de formulário, payloads da API, códigos de erro e tipos TypeScript (`z.infer<typeof ...>`) residem exclusivamente em `@fono/shared`, sem dependências de DOM, Node ou React Native, e sem uso de `any`.

---

## 1. Enums e Constantes (`auth.enums.ts`)

| Símbolo | Definição Zod | Valores Permitidos | Uso |
| :--- | :--- | :--- | :--- |
| `UserRoleSchema` | `z.enum([...])` | `'ADMIN'`, `'PROFISSIONAL'`, `'PACIENTE'`, `'AUTONOMO'` | Perfis de acesso retornados pela API e validados pelos guards |
| `UserStatusSchema` | `z.enum([...])` | `'ACTIVE'`, `'INACTIVE'` | Estado operacional da conta |
| `AuthNextStepSchema` | `z.enum([...])` | `'VERIFY_EMAIL'`, `'CHANGE_PASSWORD'`, `'MFA_SETUP'`, `'MFA_VERIFY'`, `'READY'` | Máquina de estados pós-login calculada pelo backend |
| `AuthErrorCodeSchema` | `z.enum([...])` | `'INVALID_TOKEN'`, `'TOKEN_REVOKED'`, `'ACCOUNT_INACTIVE'`, `'EMAIL_NOT_VERIFIED'`, `'EMAIL_ALREADY_REGISTERED'`, `'PASSWORD_CHANGE_REQUIRED'`, `'MFA_SETUP_REQUIRED'`, `'MFA_VERIFICATION_REQUIRED'`, `'INVALID_TOTP_CODE'`, `'TOO_MANY_REQUESTS'`, `'FORBIDDEN_ROLE'` | Códigos estruturados para tratamento determinístico no cliente |

**Constantes compartilhadas exportadas:**
- `PASSWORD_MIN_LENGTH = 8`
- `PASSWORD_MAX_LENGTH = 128`
- `TOTP_CODE_LENGTH = 6`
- `SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000` (30 minutos em milissegundos)
- `ROLE_HOME_ROUTES`: mapeamento imutável `{ ADMIN: '/admin', PROFISSIONAL: '/profissional', PACIENTE: '/paciente', AUTONOMO: '/dashboard' }`

---

## 2. Regras Primitivas de Sanitização e Validação (`auth.schema.ts`)

| Schema | Regras e Transformações | Mensagens em Português (BR) |
| :--- | :--- | :--- |
| `NormalizedEmailSchema` | `z.string().trim().toLowerCase().email(...)` (máx. 254 chars) | `"Informe um endereço de e-mail válido."` |
| `SanitizedNameSchema` | `z.string().trim().transform(stripHtmlTagsAndCollapseSpaces)` com `min(2)` e `max(120)` | `"Informe seu nome completo (mínimo de 2 caracteres)."` / `"O nome deve ter no máximo 120 caracteres."` |
| `PasswordSchema` | `z.string().min(8).max(128)` + `.refine((v) => /[A-Z]/.test(v))` + `.refine((v) => /[a-z]/.test(v))` (sem `.trim()`) | `"A senha deve ter pelo menos 8 caracteres."`, `"A senha deve conter pelo menos uma letra maiúscula."`, `"A senha deve conter pelo menos uma letra minúscula."` |
| `LoginPasswordSchema` | `z.string().min(1).max(128)` (no formulário de login aceita senha temporária legada antes da troca obrigatória sem revelar política) | `"Informe sua senha."` |
| `TotpCodeSchema` | `z.object({ code: z.string().trim().regex(/^\d{6}$/) }).strict()` | `"Informe o código numérico de 6 dígitos do aplicativo autenticador."` |

---

## 3. Schemas de Formulário (Web — React Hook Form + `zodResolver`)

### 3.1 `LoginSchema`
- Campos:
  - `email`: `NormalizedEmailSchema`
  - `password`: `LoginPasswordSchema`
- Tipo inferido: `LoginInput`

### 3.2 `RegisterAutonomousSchema`
- Campos:
  - `name`: `SanitizedNameSchema`
  - `email`: `NormalizedEmailSchema`
  - `password`: `PasswordSchema` (`FR-002`: mínimo 8 caracteres, 1 maiúscula e 1 minúscula)
  - `confirmPassword`: `z.string().min(1, 'Confirme sua senha.')`
- Refinamento cruzado: `password === confirmPassword` (erro anexado a `path: ['confirmPassword']`: `"As senhas não coincidem."`)
- Tipo inferido: `RegisterAutonomousInput`

### 3.3 `ForgotPasswordSchema`
- Campos:
  - `email`: `NormalizedEmailSchema`
- Tipo inferido: `ForgotPasswordInput`

### 3.4 `ChangePasswordSchema` (Primeiro Acesso de `PACIENTE` — `FR-007`)
- Campos:
  - `currentPassword`: `z.string().min(1, 'Informe a senha temporária atual.')` (exigida para reautenticação no Firebase Auth antes de `updatePassword`)
  - `newPassword`: `PasswordSchema` (`FR-002`)
  - `confirmNewPassword`: `z.string().min(1, 'Confirme a nova senha.')`
- Refinamentos cruzados:
  - `newPassword === confirmNewPassword` (`path: ['confirmNewPassword']`: `"As senhas não coincidem."`)
  - `newPassword !== currentPassword` (`path: ['newPassword']`: `"A nova senha deve ser diferente da senha temporária."`)
- Tipo inferido: `ChangePasswordInput`

---

## 4. Schemas de Contrato HTTP (API ↔ Web)

### 4.1 `SyncAuthRequestSchema` (`POST /auth/sync`)
- Definição:
  ```text
  z.object({
    name: SanitizedNameSchema.optional(),
  }).strict()
  ```
- **Regra de segurança (`FR-004`)**: `.strict()` rejeita qualquer campo desconhecido (como `role`, `status`, `userId` ou `mfaEnabled`) com erro de validação `400 Bad Request`.
- Tipo inferido: `SyncAuthRequest`

### 4.2 `MfaSetupResponseSchema` (`POST /auth/mfa/setup`)
- Campos:
  - `otpauthUri`: `z.string().startsWith('otpauth://totp/')`
  - `manualEntryKey`: `z.string().min(16)` (chave Base32 exibida para inserção manual caso não leia o QR Code)
  - `issuer`: `z.literal('FonoGames')`
  - `accountName`: `NormalizedEmailSchema`
- **Restrição (`FR-014`)**: este payload é entregue **somente** durante a solicitação explícita de setup do próprio usuário autenticado e jamais pode ser incluído em logs.
- Tipo inferido: `MfaSetupResponse`

### 4.3 `AuthUserProfileSchema`
- Campos públicos seguros do usuário autenticado:
  - `id`: `z.string().uuid()`
  - `name`: `z.string()`
  - `email`: `NormalizedEmailSchema`
  - `emailVerified`: `z.boolean()`
  - `role`: `UserRoleSchema`
  - `status`: `UserStatusSchema`
  - `mustChangePassword`: `z.boolean()`
  - `mfaRequired`: `z.boolean()` (derivado: `ADMIN` ou `PROFISSIONAL`)
  - `mfaEnabled`: `z.boolean()`
  - `lastLoginAt`: `z.string().datetime().nullable()`
- **Proibição estrita**: nunca expõe `mfaSecretEncrypted`, `mfaPendingSecretEncrypted`, `mfaLastUsedStep` nem `firebaseUid`.
- Tipo inferido: `AuthUserProfile`

### 4.4 `AuthSessionResponseSchema` (`POST /auth/sync`, `GET /auth/me`, `POST /auth/password-changed`, `POST /auth/mfa/verify`)
- Campos:
  - `user`: `AuthUserProfileSchema`
  - `nextStep`: `AuthNextStepSchema`
  - `mfaVerifiedForCurrentLogin`: `z.boolean()`
- Tipo inferido: `AuthSessionResponse`

### 4.5 `AdminResetMfaResponseSchema` (`POST /auth/admin/users/:userId/mfa/reset`)
- Campos:
  - `userId`: `z.string().uuid()`
  - `mfaEnabled`: `z.literal(false)`
  - `resetAt`: `z.string().datetime()`
- Tipo inferido: `AdminResetMfaResponse`

### 4.6 `ApiErrorResponseSchema`
- Campos:
  - `statusCode`: `z.number().int()`
  - `code`: `AuthErrorCodeSchema`
  - `message`: `z.string()` (sempre em português do Brasil, segura para exibição sem vazar stack trace ou segredos)
- Tipo inferido: `ApiErrorResponse`

---

## 5. Cobertura de Testes Obrigatória em `packages/shared`

Arquivo `packages/shared/src/auth/auth.schema.spec.ts` (ou `.test.ts`, seguindo o padrão `health.schema.test.ts` do pacote):
- Aceita senhas válidas com exatamente 8 caracteres, 1 maiúscula e 1 minúscula (ex.: `FonoGame`).
- Rejeita senhas com 7 caracteres, somente minúsculas ou somente maiúsculas.
- Sanitiza tags HTML em `name` (`<b>Ana</b>` → `Ana`) e normaliza `email` para minúsculas sem espaços.
- Rejeita `role`, `status` ou campos extras em `SyncAuthRequestSchema` (`.strict()`).
- Valida códigos TOTP apenas com exatamente 6 dígitos numéricos.
