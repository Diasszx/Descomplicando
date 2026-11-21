import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ROLE_HOME_ROUTES, type AuthNextStep, type UserRole } from '@fono/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthLayout } from './auth-layout';
import { getDestinationRouteForSession, useAuth } from '../hooks/use-auth';

function AuthBootstrapSkeleton() {
  return (
    <div
      className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"
      aria-busy="true"
      aria-label="Carregando sessão"
    >
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-6 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function AuthSessionErrorState({
  message,
  onRetry,
  onLogout,
}: {
  message: string;
  onRetry: () => void;
  onLogout: () => void;
}) {
  return (
    <AuthLayout
      title="Não foi possível carregar sua sessão"
      description="Houve uma falha ao verificar seu cadastro interno com o servidor."
    >
      <Alert variant="destructive">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <AlertTitle>Erro de conexão</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
      </Alert>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          onClick={onRetry}
          className="w-full h-11 rounded-2xl bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground font-bold"
        >
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          Tentar novamente
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onLogout}
          className="w-full h-11 rounded-2xl"
        >
          Voltar para o login
        </Button>
      </div>
    </AuthLayout>
  );
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isBootstrapping, session } = useAuth();

  if (isBootstrapping) {
    return <AuthBootstrapSkeleton />;
  }

  if (session) {
    return <Navigate to={getDestinationRouteForSession(session)} replace />;
  }

  return <>{children}</>;
}

export interface PendingSessionRouteProps {
  requiredStep: Exclude<AuthNextStep, 'READY'>;
  allowOptionalMfaSetup?: boolean;
  children: React.ReactNode;
}

export function PendingSessionRoute({
  requiredStep,
  allowOptionalMfaSetup = false,
  children,
}: PendingSessionRouteProps) {
  const { isBootstrapping, isAuthenticated, session, sessionError, retrySessionSync, logout } =
    useAuth();

  if (isBootstrapping) {
    return <AuthBootstrapSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (sessionError && !session) {
    return (
      <AuthSessionErrorState
        message={sessionError}
        onRetry={() => void retrySessionSync()}
        onLogout={() => void logout('manual')}
      />
    );
  }

  if (!session) {
    return <AuthBootstrapSkeleton />;
  }

  if (allowOptionalMfaSetup && session.nextStep === 'READY' && !session.user.mfaEnabled) {
    return <>{children}</>;
  }

  if (session.nextStep !== requiredStep) {
    return <Navigate to={getDestinationRouteForSession(session)} replace />;
  }

  return <>{children}</>;
}

export interface RoleRouteGuardProps {
  allowedRoles: readonly UserRole[];
  children: React.ReactNode;
}

export function RoleRouteGuard({ allowedRoles, children }: RoleRouteGuardProps) {
  const { isBootstrapping, isAuthenticated, session, sessionError, retrySessionSync, logout } =
    useAuth();

  if (isBootstrapping) {
    return <AuthBootstrapSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (sessionError && !session) {
    return (
      <AuthSessionErrorState
        message={sessionError}
        onRetry={() => void retrySessionSync()}
        onLogout={() => void logout('manual')}
      />
    );
  }

  if (!session) {
    return <AuthBootstrapSkeleton />;
  }

  if (session.nextStep !== 'READY') {
    return <Navigate to={getDestinationRouteForSession(session)} replace />;
  }

  if (!allowedRoles.includes(session.user.role)) {
    return <Navigate to={ROLE_HOME_ROUTES[session.user.role]} replace />;
  }

  return <>{children}</>;
}

export function RootRedirect() {
  const { isBootstrapping, isAuthenticated, session, sessionError, retrySessionSync, logout } =
    useAuth();

  if (isBootstrapping) {
    return <AuthBootstrapSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (sessionError && !session) {
    return (
      <AuthSessionErrorState
        message={sessionError}
        onRetry={() => void retrySessionSync()}
        onLogout={() => void logout('manual')}
      />
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDestinationRouteForSession(session)} replace />;
}
