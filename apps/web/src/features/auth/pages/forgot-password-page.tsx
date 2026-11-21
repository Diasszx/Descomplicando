import * as React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { ForgotPasswordSchema, type ForgotPasswordInput } from '@fono/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthLayout } from '../components/auth-layout';
import { useAuth } from '../hooks/use-auth';
import {
  extractErrorCode,
  translateFirebaseAuthError,
} from '../services/firebase-auth.service';

const NEUTRAL_CONFIRMATION_MESSAGE =
  'Se o endereço informado estiver cadastrado, você receberá as instruções de redefinição por e-mail em instantes.';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setSubmitError(null);
    try {
      await requestPasswordReset(data);
      setSubmitted(true);
    } catch (error) {
      const code = extractErrorCode(error);
      // Garantia de resposta neutra mesmo se provedor sinalizar conta ausente (FR-008)
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setSubmitted(true);
        return;
      }
      setSubmitError(translateFirebaseAuthError(error, 'forgotPassword'));
    }
  };

  return (
    <AuthLayout
      title="Recuperar senha"
      description="Informe seu e-mail cadastrado para receber um link de redefinição de senha."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Voltar para o login
        </Link>
      }
    >
      {submitted ? (
        <div className="space-y-4">
          <Alert variant="success">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <AlertTitle>Solicitação recebida</AlertTitle>
              <AlertDescription>{NEUTRAL_CONFIRMATION_MESSAGE}</AlertDescription>
            </div>
          </Alert>

          <Link
            to="/login"
            className="inline-flex w-full h-11 items-center justify-center rounded-2xl bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground font-bold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Voltar para a tela de login
          </Link>
        </div>
      ) : (
        <>
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="nome@exemplo.com"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'forgot-email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="forgot-email-error" className="text-xs font-medium text-destructive">
                  {errors.email.message}
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
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                  Enviar instruções
                </>
              )}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
