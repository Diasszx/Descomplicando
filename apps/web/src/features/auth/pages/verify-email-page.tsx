import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, LogOut, MailCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthLayout } from '../components/auth-layout';
import { getDestinationRouteForSession, useAuth } from '../hooks/use-auth';
import { translateFirebaseAuthError } from '../services/firebase-auth.service';

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { session, resendEmailVerification, refreshVerificationStatus, logout } = useAuth();

  const [cooldown, setCooldown] = React.useState(0);
  const [isResending, setIsResending] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsResending(true);
    try {
      await resendEmailVerification();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStatusMessage(
        'Enviamos um novo link de confirmação. Verifique sua caixa de entrada e a pasta de spam.',
      );
    } catch (error) {
      setErrorMessage(translateFirebaseAuthError(error, 'verifyEmail'));
    } finally {
      setIsResending(false);
    }
  };

  const handleConfirmVerified = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsChecking(true);
    try {
      const updated = await refreshVerificationStatus();
      if (updated && updated.nextStep !== 'VERIFY_EMAIL') {
        navigate(getDestinationRouteForSession(updated), { replace: true });
        return;
      }
      setErrorMessage(
        'Ainda não identificamos a confirmação do seu e-mail. Abra o link enviado e tente novamente.',
      );
    } catch (error) {
      setErrorMessage(translateFirebaseAuthError(error, 'verifyEmail'));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <AuthLayout
      title="Confirme seu e-mail"
      description="Para proteger sua conta, a confirmação do e-mail é obrigatória antes do acesso ao painel."
    >
      <div className="rounded-2xl border border-border bg-muted/50 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-game-blue-subtle text-game-blue-foreground flex items-center justify-center shrink-0">
          <MailCheck className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="text-sm space-y-1">
          <p className="font-semibold text-foreground">Verifique sua caixa de entrada</p>
          <p className="text-muted-foreground">
            Enviamos um link de confirmação para{' '}
            <strong className="text-foreground">{session?.user.email ?? 'seu e-mail'}</strong>.
          </p>
        </div>
      </div>

      {statusMessage && (
        <Alert variant="success">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <AlertTitle>Instruções reenviadas</AlertTitle>
            <AlertDescription>{statusMessage}</AlertDescription>
          </div>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Button
          type="button"
          onClick={() => void handleConfirmVerified()}
          disabled={isChecking || isResending}
          className="w-full h-11 rounded-2xl bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground font-bold"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Já confirmei meu e-mail
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => void handleResend()}
          disabled={isResending || isChecking || cooldown > 0}
          className="w-full h-11 rounded-2xl"
        >
          {isResending
            ? 'Reenviando...'
            : cooldown > 0
              ? `Reenviar e-mail de verificação (${cooldown}s)`
              : 'Reenviar e-mail de verificação'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => void logout('manual')}
          className="w-full h-10 rounded-2xl text-muted-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
          Sair da conta
        </Button>
      </div>
    </AuthLayout>
  );
}
