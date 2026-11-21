# Contrato de Rotas Web, Sessão e UI (`apps/web`)

**Feature**: `002-firebase-auth-login`  
**Arquitetura**: `apps/web/src/features/auth/` (`components/`, `hooks/`, `pages/`, `services/`)  
**Design System**: tokens semânticos em `apps/web/src/index.css` ([fono-ui-design-system](../../../.agents/skills/fono-ui-design-system/SKILL.md))

---

## 1. Mapa de Rotas Web (`react-router-dom`)

### 1.1 Rotas Públicas (redirecionam se já autenticado com `nextStep === 'READY'`)
| Rota | Página | Funcionalidade |
| :--- | :--- | :--- |
| `/login` | `LoginPage` | Formulário e-mail/senha (`LoginSchema`), link para `/recuperar-senha` e `/cadastro`, banner informativo quando redirecionado por `?reason=inactivity` ou `?reason=revoked`. |
| `/cadastro` | `RegisterPage` | Auto-cadastro `AUTONOMO` (`RegisterAutonomousSchema`) com indicador objetivo dos requisitos da senha (`FR-002`), envio automático de verificação de e-mail e erro explícito se o e-mail já estiver cadastrado (`FR-006`). |
| `/recuperar-senha` | `ForgotPasswordPage` | Solicitação de redefinição de senha (`ForgotPasswordSchema`) com mensagem de confirmação neutra (`FR-008`). |

### 1.2 Rotas de Pendência de Sessão (exigem usuário autenticado no Firebase, redirecionadas via `AuthNextStep`)
| Rota | `nextStep` Exigido | Página | Funcionalidade |
| :--- | :--- | :--- | :--- |
| `/verificar-email` | `VERIFY_EMAIL` | `VerifyEmailPage` | Orienta confirmação na caixa de entrada, oferece botão **"Reenviar e-mail de verificação"** (com cooldown anti-spam de 60s) e botão **"Já confirmei meu e-mail"** (`reload(user)` + `getIdToken(true)` + re-sync). |
| `/primeiro-acesso/nova-senha` | `CHANGE_PASSWORD` | `ForcePasswordChangePage` | Troca obrigatória de senha para `PACIENTE` (`ChangePasswordSchema`), reautenticando com a senha temporária, executando `updatePassword` no Firebase, renovando o token via `getIdToken(true)` e chamando `POST /auth/password-changed` (`FR-007`). |
| `/mfa/configurar` | `MFA_SETUP` | `MfaSetupPage` | Chama `POST /auth/mfa/setup`, renderiza QR Code SVG (`qrcode.react`) + chave manual copiável, valida o 1º código TOTP de 6 dígitos (`TotpCodeSchema`) via `POST /auth/mfa/verify` (`FR-005`). |
| `/mfa/verificar` | `MFA_VERIFY` | `MfaVerifyPage` | Solicita código TOTP de 6 dígitos do app autenticador e submete `POST /auth/mfa/verify` (`FR-005`), com link de ajuda caso o profissional tenha perdido o dispositivo. |

### 1.3 Rotas Protegidas por Perfil (exigem `nextStep === 'READY'` e perfil correspondente)
| Rota | Perfil Permitido | Página Inicial |
| :--- | :--- | :--- |
| `/admin` | `ADMIN` | `AdminHomePage` — Shell do Design System (sidebar + cabeçalho + indicador de perfil Gestor + ação Sair) |
| `/profissional` | `PROFISSIONAL` | `ProfissionalHomePage` — Shell do Design System (sidebar + cabeçalho + indicador de perfil Fonoaudiólogo + ação Sair) |
| `/paciente` | `PACIENTE` | `PacienteHomePage` — Shell do Design System (sidebar + cabeçalho + visão do plano/jogos liberados + ação Sair) |
| `/dashboard` | `AUTONOMO` | `AutonomoDashboardPage` — `DashboardView` existente adaptado para exibir usuário autenticado e botão `Logout` funcional |
| `/` e `*` | Qualquer | Redirecionador inteligente (`RootRedirect`): envia para `/login` se não autenticado, para a rota de `nextStep` se pendente, ou para `ROLE_HOME_ROUTES[user.role]` se `READY`. |

> **Bloqueio cruzado de perfis (`FR-011`, `SC-004`)**: se um usuário `AUTONOMO` acessar `/admin` ou um `PACIENTE` acessar `/profissional`, o `RoleRouteGuard` bloqueia a renderização e redireciona imediatamente para `ROLE_HOME_ROUTES[user.role]`.

---

## 2. Contrato de Estado de Sessão e Hooks (`TanStack Query` + `Axios`)

### 2.1 Interceptores do `apiClient` (`apps/web/src/lib/api-client.ts`)
- **Request interceptor**: obtém `auth.currentUser?.getIdToken()` em memória do SDK do Firebase (nunca de `localStorage` customizado) e anexa `Authorization: Bearer <idToken>`.
- **Response interceptor**:
  - Ao receber `401 INVALID_TOKEN` (expiração de ID Token durante uso ativo), realiza **1 único retry silencioso** obtendo token renovado com `auth.currentUser?.getIdToken(true)`; se o retry falhar ou não houver `currentUser`, limpa o cache do `QueryClient`, executa logout local propagado e redireciona para `/login`.
  - Ao receber `401 TOKEN_REVOKED` ou `403 ACCOUNT_INACTIVE`, não realiza retry: limpa imediatamente o cache do `QueryClient`, propaga logout entre abas e redireciona para `/login?reason=revoked`.

### 2.2 Hooks Obrigatórios (`apps/web/src/features/auth/hooks/`)
| Hook | Tipo | Responsabilidade |
| :--- | :--- | :--- |
| `useAuth()` | Context Hook (`AuthProvider`) | Expõe `firebaseUser`, `session` (`AuthSessionResponse \| null`), `isBootstrapping`, `isAuthenticated`, `signIn`, `registerAutonomous`, `requestPasswordReset`, `completeForcedPasswordChange`, `logout`. |
| `useAuthSession()` | `useQuery` (`['auth', 'session']`) | Consulta `GET /auth/me` (ou inicializa com retorno de `POST /auth/sync`) sempre que houver `firebaseUser` ativo. |
| `useSyncAuth()` | `useMutation` | Executa `POST /auth/sync` após login/cadastro e atualiza cache `['auth', 'session']`. |
| `useMfaSetup()` | `useMutation` | Executa `POST /auth/mfa/setup` retornando `MfaSetupResponse`. |
| `useMfaVerify()` | `useMutation` | Executa `POST /auth/mfa/verify` com `{ code }` e atualiza cache `['auth', 'session']`. |
| `usePasswordChanged()` | `useMutation` | Executa `POST /auth/password-changed` e atualiza cache `['auth', 'session']`. |
| `useLogout()` | `useMutation` | Dispara evento entre abas, chama `POST /auth/logout` (best-effort), `signOut(auth)` e `queryClient.clear()`. |
| `useSessionTimeout()` | Side-effect Hook | Monitora atividade local e eventos entre abas por 30 minutos (`SESSION_INACTIVITY_TIMEOUT_MS`). |

---

## 3. Protocolo de Timeout (30 min) e Sincronização Entre Abas (`FR-009`, `FR-010`, `SC-005`)

- **Canal primário**: `BroadcastChannel('fono-auth-session')`.
- **Canal de fallback** (compatibilidade entre abas/contextos): eventos `window.addEventListener('storage')` sobre chaves de metadados:
  - `fono:auth:activity` → string numérica com timestamp epoch em ms (`Date.now()`).
  - `fono:auth:event` → JSON `{ type: 'LOGOUT' | 'TIMEOUT', timestamp: number }`.
- **Regras de segurança (Guardrail Constituição)**:
  1. **Zero dados sensíveis em `localStorage`/`sessionStorage`**: nunca gravar token, `role`, `userId`, e-mail ou segredo TOTP nessas chaves.
  2. **Throttle de atividade**: interações (`pointerdown`, `keydown`, `scroll`, `focus`) atualizam a atividade local imediatamente e publicam para outras abas no máximo 1 vez a cada 15 segundos.
  3. **Disparo de timeout**: um timer verifica o vencimento de `lastActivity + 30 min`; ao atingir 30 min sem atividade em **nenhuma** aba, a aba emissora dispara `{ type: 'TIMEOUT', timestamp }` e todas as abas abertas executam logout local imediato (< 2s) + `queryClient.clear()` + navegação para `/login?reason=inactivity`.
  4. **Disparo de logout manual**: clicar em "Sair / Logout" em qualquer aba publica `{ type: 'LOGOUT', timestamp }`, fazendo todas as demais abas encerrarem a sessão e redirecionarem para `/login` imediatamente.

---

## 4. Mapeamento de Erros Firebase Auth → Mensagens Seguras (PT-BR)

| Contexto | Códigos Firebase Auth | Mensagem Exibida ao Usuário | Regra Atendida |
| :--- | :--- | :--- | :--- |
| **Login** | `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-email` | `"E-mail ou senha inválidos. Verifique seus dados e tente novamente."` | `US1-AS5` (não enumera contas) |
| **Login / Recuperação / MFA** | `auth/too-many-requests` ou HTTP `429` | `"Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente."` | `FR-012`, Edge Case |
| **Cadastro Autônomo** | `auth/email-already-in-use` ou HTTP `409` | `"Este e-mail já está cadastrado. Faça login ou utilize a opção 'Esqueci minha senha'."` | `US3-AS2`, `FR-006` |
| **Recuperação de Senha** | Sucesso **ou** `auth/user-not-found` | `"Se o endereço informado estiver cadastrado, você receberá as instruções de redefinição por e-mail em instantes."` | `US4-AS1`, `FR-008` (resposta neutra) |
| **Troca de Senha (`PACIENTE`)** | `auth/wrong-password`, `auth/invalid-credential` | `"A senha temporária atual informada não confere."` | `FR-007` |
| **Rede / Indisponibilidade** | `auth/network-request-failed` ou erro de rede Axios | `"Não foi possível conectar ao servidor. Verifique sua internet e tente novamente."` | `FR-013`, Edge Case |

---

## 5. Conformidade com o Design System e Acessibilidade

- **Tokens semânticos obrigatórios**: cartões de login/cadastro/MFA usam `bg-card text-card-foreground rounded-3xl border border-border shadow-xs` sobre fundo `bg-background`; botão primário usa `bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground rounded-2xl`; destaque institucional usa `bg-brand-amber text-brand-amber-foreground`.
- **Zero cores hardcoded**: proibido hexadecimais (`#...`) ou classes `bg-[#...]` no JSX.
- **Zero anúncios**: proibido qualquer texto promocional sobre remoção de propagandas.
- **Estados obrigatórios (`FR-013`)**:
  - **Loading**: `Skeleton` estrutural durante bootstrap da sessão e desabilitação com spinner/label durante submits (bloqueia duplo clique).
  - **Error**: componente `Alert` acessível (`role="alert"`, foco gerenciado ou anunciado por leitor de tela) e mensagens inline ligadas via `aria-describedby` e `aria-invalid`.
  - **Empty/Onboarding**: instruções claras na tela de verificação de e-mail e na tela de vinculação de aplicativo autenticador.
- **Teclado e Foco**: navegação integral via `Tab`, `Enter`, `Space` e anel visível `focus-visible:ring-2 focus-visible:ring-ring`.
