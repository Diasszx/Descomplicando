import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, HelpCircle, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { TotpCodeSchema, type TotpCodeInput } from '@fono/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '../components/auth-layout';
import { getDestinationRouteForSession, useAuth } from '../hooks/use-auth';
import { useMfaVerify } from '../hooks/use-auth-session';
import { translateFirebaseAuthError } from '../services/firebase-auth.service';

export function MfaVerifyPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const mfaVerifyMutation = useMfaVerify();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpCodeInput>({
    resolver: zodResolver(TotpCodeSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = async (data: TotpCodeInput) => {
    setSubmitError(null);
    try {
      const updatedSession = await mfaVerifyMutation.mutateAsync(data);
      navigate(getDestinationRouteForSession(updatedSession), { replace: true });
    } catch (error) {
      setSubmitError(translateFirebaseAuthError(error, 'mfa'));
    }
  };

  return (
    <AuthLayout
      title="Verificação em duas etapas"
      description="Abra seu aplicativo autenticador e informe o código temporário de 6 dígitos para concluir o acesso."
    >
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="mfa-verify-code">Código do aplicativo autenticador</Label>
          <Input
            id="mfa-verify-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            disabled={isSubmitting}
            className="text-center tracking-[0.35em] font-mono text-base font-bold"
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? 'mfa-verify-code-error' : undefined}
            {...register('code')}
          />
          {errors.code && (
            <p id="mfa-verify-code-error" className="text-xs font-medium text-destructive">
              {errors.code.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-2xl bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground font-bold shadow-xs"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              Verificando...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" aria-hidden="true" />
              Verificar código
            </>
          )}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-muted/50 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        <p>
          <strong className="text-foreground">Perdeu acesso ao aplicativo autenticador?</strong>{' '}
          Solicite ao gestor administrativo da clínica a redefinição do MFA da sua conta para
          vincular um novo dispositivo com segurança.
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={() => void logout('manual')}
        disabled={isSubmitting}
        className="w-full h-10 rounded-2xl text-muted-foreground"
      >
        <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
        Sair da conta
      </Button>
    </AuthLayout>
  );
}
