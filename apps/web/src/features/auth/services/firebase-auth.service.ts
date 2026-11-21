import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  reload,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import axios from 'axios';
import { ApiErrorResponseSchema, type ApiErrorResponse } from '@fono/shared';
import { webEnv } from '@/lib/env';

export type FirebaseAuthErrorContext =
  | 'login'
  | 'register'
  | 'forgotPassword'
  | 'changePassword'
  | 'verifyEmail'
  | 'mfa'
  | 'generic';

let authInstance: Auth | null = null;
let emulatorConnected = false;

function getOrCreateFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp({
    apiKey: webEnv.VITE_FIREBASE_API_KEY,
    authDomain: webEnv.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: webEnv.VITE_FIREBASE_PROJECT_ID,
    appId: webEnv.VITE_FIREBASE_APP_ID,
  });
}

export function getFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance;
  }

  const app = getOrCreateFirebaseApp();
  const auth = getAuth(app);

  if (webEnv.VITE_FIREBASE_AUTH_EMULATOR_URL && !emulatorConnected) {
    connectAuthEmulator(auth, webEnv.VITE_FIREBASE_AUTH_EMULATOR_URL, {
      disableWarnings: true,
    });
    emulatorConnected = true;
  }

  void setPersistence(auth, browserLocalPersistence).catch(() => {
    // Em ambientes de teste/navegadores restritos, mantém persistência em memória
  });

  authInstance = auth;
  return auth;
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    return null;
  }
  return auth.currentUser.getIdToken(forceRefresh);
}

export function subscribeAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  try {
    await updateProfile(credential.user, { displayName });
  } catch {
    // Não bloqueia cadastro se updateProfile falhar; nome será persistido no PostgreSQL via /auth/sync
  }

  try {
    await sendEmailVerification(credential.user);
  } catch {
    // Best-effort para nunca bloquear /auth/sync após criação da conta; o usuário poderá reenviar em /verificar-email
  }
  return credential.user;
}

export async function resendVerificationEmail(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    throw new Error('Usuário não autenticado.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function reloadCurrentUser(): Promise<FirebaseUser | null> {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    return null;
  }
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const code = extractErrorCode(error);
    // Resposta neutra obrigatória (FR-008): não revelar existência de conta
    if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
      return;
    }
    throw error;
  }
}

export async function reauthenticateAndUpdatePassword(
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
  return user.getIdToken(true);
}

export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function extractErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return undefined;
}

export function parseStructuredApiError(error: unknown): ApiErrorResponse | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const parsed = ApiErrorResponseSchema.safeParse(error.response?.data);
  return parsed.success ? parsed.data : null;
}

export function translateFirebaseAuthError(
  error: unknown,
  context: FirebaseAuthErrorContext = 'generic',
): string {
  const apiError = parseStructuredApiError(error);
  if (apiError) {
    if (apiError.code === 'EMAIL_ALREADY_REGISTERED') {
      return "Este e-mail já está cadastrado. Faça login ou utilize a opção 'Esqueci minha senha'.";
    }
    if (apiError.code === 'TOO_MANY_REQUESTS') {
      return 'Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente.';
    }
    return apiError.message;
  }

  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      return 'Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente.';
    }
    if (error.response?.status === 409) {
      return "Este e-mail já está cadastrado. Faça login ou utilize a opção 'Esqueci minha senha'.";
    }
    if (!error.response) {
      return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
    }
  }

  const code = extractErrorCode(error);

  if (code === 'auth/too-many-requests') {
    return 'Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  if (code === 'auth/email-already-in-use') {
    return "Este e-mail já está cadastrado. Faça login ou utilize a opção 'Esqueci minha senha'.";
  }

  if (code === 'auth/user-disabled') {
    return 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.';
  }

  if (code === 'auth/requires-recent-login') {
    return 'Por segurança, faça login novamente antes de concluir esta ação.';
  }

  if (
    context === 'changePassword' &&
    (code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials')
  ) {
    return 'A senha temporária atual informada não confere.';
  }

  if (
    context === 'login' &&
    (code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials' ||
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-email')
  ) {
    return 'E-mail ou senha inválidos. Verifique seus dados e tente novamente.';
  }

  return 'Não foi possível concluir sua solicitação no momento. Tente novamente em instantes.';
}
