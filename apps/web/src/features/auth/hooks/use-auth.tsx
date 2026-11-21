import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  ROLE_HOME_ROUTES,
  type AuthSessionResponse,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterAutonomousInput,
} from '@fono/shared';
import { configureApiAuthHandlers } from '@/lib/api-client';
import {
  getCurrentFirebaseUser,
  getCurrentIdToken,
  parseStructuredApiError,
  reauthenticateAndUpdatePassword,
  registerWithEmail,
  reloadCurrentUser,
  resendVerificationEmail,
  sendPasswordReset,
  signInWithEmail,
  signOutFirebase,
  subscribeAuthState,
  translateFirebaseAuthError,
} from '../services/firebase-auth.service';
import {
  AUTH_SESSION_QUERY_KEY,
  useAuthSession,
  useLogout,
  usePasswordChanged,
  useSyncAuth,
} from './use-auth-session';
import {
  broadcastSessionEvent,
  createSessionSenderId,
  useSessionTimeout,
} from './use-session-timeout';

export type LogoutReason = 'manual' | 'inactivity' | 'revoked' | 'inactive';

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  session: AuthSessionResponse | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  sessionError: string | null;
  signIn: (input: LoginInput) => Promise<AuthSessionResponse>;
  registerAutonomous: (input: RegisterAutonomousInput) => Promise<AuthSessionResponse>;
  requestPasswordReset: (input: ForgotPasswordInput) => Promise<void>;
  completeForcedPasswordChange: (input: ChangePasswordInput) => Promise<AuthSessionResponse>;
  resendEmailVerification: () => Promise<void>;
  refreshVerificationStatus: () => Promise<AuthSessionResponse | null>;
  retrySessionSync: () => Promise<AuthSessionResponse | null>;
  logout: (reason?: LogoutReason) => Promise<void>;
}

type ManualAuthState = 'idle' | 'submitting' | 'failed';

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function getDestinationRouteForSession(session: AuthSessionResponse): string {
  switch (session.nextStep) {
    case 'VERIFY_EMAIL':
      return '/verificar-email';
    case 'CHANGE_PASSWORD':
      return '/primeiro-acesso/nova-senha';
    case 'MFA_SETUP':
      return '/mfa/configurar';
    case 'MFA_VERIFY':
      return '/mfa/verificar';
    case 'READY':
      return ROLE_HOME_ROUTES[session.user.role];
  }
}

function isFatalManualSyncError(error: unknown): boolean {
  const apiError = parseStructuredApiError(error);
  if (!apiError) {
    return false;
  }
  return (
    apiError.code === 'ACCOUNT_INACTIVE' ||
    apiError.code === 'EMAIL_ALREADY_REGISTERED' ||
    apiError.code === 'EMAIL_NOT_VERIFIED' ||
    apiError.code === 'TOKEN_REVOKED'
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [firebaseReady, setFirebaseReady] = React.useState(false);
  const [manualAuthState, setManualAuthState] = React.useState<ManualAuthState>('idle');

  const tabSenderIdRef = React.useRef<string>(createSessionSenderId());
  const manualAuthInProgressRef = React.useRef(false);
  const isLoggingOutRef = React.useRef(false);
  const passwordUpdatedUidRef = React.useRef<string | null>(null);

  const syncMutation = useSyncAuth();
  const passwordChangedMutation = usePasswordChanged();
  const logoutMutation = useLogout();

  const syncMutateAsync = syncMutation.mutateAsync;
  const passwordChangedMutateAsync = passwordChangedMutation.mutateAsync;
  const logoutMutateAsync = logoutMutation.mutateAsync;

  const sessionQuery = useAuthSession(
    firebaseReady && Boolean(firebaseUser) && manualAuthState === 'idle',
    firebaseUser?.displayName,
  );

  const performLocalSignOut = React.useCallback(
    async (
      reason: LogoutReason,
      options: { callServerLogout: boolean; broadcast: boolean; redirect?: boolean } = {
        callServerLogout: false,
        broadcast: false,
        redirect: true,
      },
    ) => {
      if (isLoggingOutRef.current) {
        return;
      }
      isLoggingOutRef.current = true;
      try {
        if (options.broadcast) {
          broadcastSessionEvent(
            reason === 'inactivity' ? 'TIMEOUT' : 'LOGOUT',
            tabSenderIdRef.current,
          );
        }
        if (options.callServerLogout) {
          await logoutMutateAsync().catch(() => undefined);
        }
        await signOutFirebase().catch(() => undefined);
      } finally {
        queryClient.clear();
        passwordUpdatedUidRef.current = null;
        setFirebaseUser(null);
        setManualAuthState('idle');
        isLoggingOutRef.current = false;

        if (options.redirect !== false) {
          if (reason === 'inactivity') {
            navigate('/login?reason=inactivity', { replace: true });
          } else if (reason === 'revoked') {
            navigate('/login?reason=revoked', { replace: true });
          } else if (reason === 'inactive') {
            navigate('/login?reason=inactive', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }
      }
    },
    [logoutMutateAsync, navigate, queryClient],
  );

  useSessionTimeout({
    enabled: Boolean(firebaseUser) && manualAuthState === 'idle',
    senderId: tabSenderIdRef.current,
    onTimeout: () => {
      void performLocalSignOut('inactivity', {
        callServerLogout: true,
        broadcast: false,
        redirect: true,
      });
    },
    onRemoteTimeout: () => {
      void performLocalSignOut('inactivity', {
        callServerLogout: false,
        broadcast: false,
        redirect: true,
      });
    },
    onRemoteLogout: () => {
      void performLocalSignOut('manual', {
        callServerLogout: false,
        broadcast: false,
        redirect: true,
      });
    },
  });

  React.useEffect(() => {
    configureApiAuthHandlers({
      getToken: getCurrentIdToken,
      onSessionInvalidated: async (reason) => {
        // Durante login/cadastro ativo, preserva a página atual para exibir o erro no formulário
        if (manualAuthInProgressRef.current) {
          await signOutFirebase().catch(() => undefined);
          queryClient.removeQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
          setFirebaseUser(null);
          return;
        }

        const mappedReason: LogoutReason =
          reason === 'inactive' ? 'inactive' : reason === 'revoked' ? 'revoked' : 'manual';
        await performLocalSignOut(mappedReason, {
          callServerLogout: false,
          broadcast: true,
          redirect: true,
        });
      },
    });

    return () => {
      configureApiAuthHandlers(null);
    };
  }, [performLocalSignOut, queryClient]);

  React.useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setFirebaseUser(user);
      setFirebaseReady(true);
      if (!user) {
        passwordUpdatedUidRef.current = null;
        queryClient.removeQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const signIn = React.useCallback(
    async (input: LoginInput): Promise<AuthSessionResponse> => {
      manualAuthInProgressRef.current = true;
      setManualAuthState('submitting');
      try {
        const user = await signInWithEmail(input.email, input.password);
        setFirebaseUser(user);
        setFirebaseReady(true);
        const session = await syncMutateAsync({});
        setManualAuthState('idle');
        return session;
      } catch (error) {
        if (isFatalManualSyncError(error)) {
          await signOutFirebase().catch(() => undefined);
          queryClient.removeQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
          setFirebaseUser(null);
          setManualAuthState('idle');
        } else {
          setManualAuthState('failed');
        }
        throw error;
      } finally {
        manualAuthInProgressRef.current = false;
      }
    },
    [queryClient, syncMutateAsync],
  );

  const registerAutonomous = React.useCallback(
    async (input: RegisterAutonomousInput): Promise<AuthSessionResponse> => {
      manualAuthInProgressRef.current = true;
      setManualAuthState('submitting');
      try {
        // Recuperação idempotente caso a conta já tenha sido criada no Firebase na tentativa anterior
        // e apenas /auth/sync tenha falhado por instabilidade de rede
        const existingFirebaseUser = getCurrentFirebaseUser();
        const isResumingSameEmail =
          existingFirebaseUser !== null &&
          existingFirebaseUser.email?.trim().toLowerCase() === input.email;

        const user = isResumingSameEmail
          ? existingFirebaseUser
          : await registerWithEmail(input.email, input.password, input.name);

        setFirebaseUser(user);
        setFirebaseReady(true);
        const session = await syncMutateAsync({ name: input.name });
        setManualAuthState('idle');
        return session;
      } catch (error) {
        if (isFatalManualSyncError(error)) {
          await signOutFirebase().catch(() => undefined);
          queryClient.removeQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
          setFirebaseUser(null);
          setManualAuthState('idle');
        } else {
          setManualAuthState('failed');
        }
        throw error;
      } finally {
        manualAuthInProgressRef.current = false;
      }
    },
    [queryClient, syncMutateAsync],
  );

  const requestPasswordReset = React.useCallback(
    async (input: ForgotPasswordInput): Promise<void> => {
      await sendPasswordReset(input.email);
    },
    [],
  );

  const completeForcedPasswordChange = React.useCallback(
    async (input: ChangePasswordInput): Promise<AuthSessionResponse> => {
      const currentUid = firebaseUser?.uid ?? getCurrentFirebaseUser()?.uid ?? null;
      const alreadyUpdatedInFirebase =
        currentUid !== null && passwordUpdatedUidRef.current === currentUid;

      if (alreadyUpdatedInFirebase) {
        await getCurrentIdToken(true);
      } else {
        await reauthenticateAndUpdatePassword(input.currentPassword, input.newPassword);
        if (currentUid) {
          passwordUpdatedUidRef.current = currentUid;
        }
      }

      const updatedSession = await passwordChangedMutateAsync();
      passwordUpdatedUidRef.current = null;
      return updatedSession;
    },
    [firebaseUser?.uid, passwordChangedMutateAsync],
  );

  const resendEmailVerification = React.useCallback(async (): Promise<void> => {
    await resendVerificationEmail();
  }, []);

  const refreshVerificationStatus = React.useCallback(async (): Promise<AuthSessionResponse | null> => {
    const reloadedUser = await reloadCurrentUser();
    if (!reloadedUser) {
      return null;
    }
    setFirebaseUser(reloadedUser);
    return syncMutateAsync({});
  }, [syncMutateAsync]);

  const retrySessionSync = React.useCallback(async (): Promise<AuthSessionResponse | null> => {
    if (!firebaseUser) {
      return null;
    }
    setManualAuthState('idle');
    return syncMutateAsync({});
  }, [firebaseUser, syncMutateAsync]);

  const logout = React.useCallback(
    async (reason: LogoutReason = 'manual'): Promise<void> => {
      await performLocalSignOut(reason, {
        callServerLogout: Boolean(firebaseUser),
        broadcast: true,
        redirect: true,
      });
    },
    [firebaseUser, performLocalSignOut],
  );

  const session = sessionQuery.data ?? null;
  const isBootstrapping =
    !firebaseReady ||
    (Boolean(firebaseUser) && !session && manualAuthState === 'idle' && sessionQuery.isLoading);

  const sessionError =
    sessionQuery.isError && !session
      ? translateFirebaseAuthError(sessionQuery.error, 'generic')
      : null;

  const value = React.useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      session,
      isBootstrapping,
      isAuthenticated: Boolean(firebaseUser),
      sessionError,
      signIn,
      registerAutonomous,
      requestPasswordReset,
      completeForcedPasswordChange,
      resendEmailVerification,
      refreshVerificationStatus,
      retrySessionSync,
      logout,
    }),
    [
      firebaseUser,
      session,
      isBootstrapping,
      sessionError,
      signIn,
      registerAutonomous,
      requestPasswordReset,
      completeForcedPasswordChange,
      resendEmailVerification,
      refreshVerificationStatus,
      retrySessionSync,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return context;
}
