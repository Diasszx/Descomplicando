import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { RegisterAutonomousSchema, type RegisterAutonomousInput } from '@fono/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '../components/auth-layout';
import { PasswordRequirementsHint } from '../components/password-requirements-hint';
import { getDestinationRouteForSession, useAuth } from '../hooks/use-auth';
import { translateFirebaseAuthError } from '../services/firebase-auth.service';

export function RegisterPage() {
  const navigate = useNavigate();
  const { registerAutonomous } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterAutonomousInput>({
    resolver: zodResolver(RegisterAutonomousSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: RegisterAutonomousInput) => {
    setSubmitError(null);
    try {
      const session = await registerAutonomous(data);
      navigate(getDestinationRouteForSession(session), { replace: true });
    } catch (error) {
      setSubmitError(translateFirebaseAuthError(error, 'register'));
    }
  };

  return (
    <AuthLayout
      title="Criar conta autônoma"
      description="Cadastre-se gratuitamente para explorar os jogos fonoaudiológicos e acompanhar seu progresso pessoal."
      footer={
        <p>
          Já possui uma conta?{' '}
          <Link
            to="/login"
            className="font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            Fazer login
          </Link>
        </p>
      }
    >
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="register-name">Nome completo</Label>
          <Input
            id="register-name"
            type="text"
            autoComplete="name"
            placeholder="Seu nome completo"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'register-name-error' : undefined}
            {...register('name')}
          />
          {errors.name && (
            <p id="register-name-error" className="text-xs font-medium text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="register-email">E-mail</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="nome@exemplo.com"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="register-email-error" className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="register-password">Senha</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="Crie uma senha segura"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password
                ? 'register-password-requirements register-password-error'
                : 'register-password-requirements'
            }
            {...register('password')}
          />
          {errors.password && (
            <p id="register-password-error" className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <PasswordRequirementsHint id="register-password-requirements" password={passwordValue} />

        <div className="space-y-1.5">
          <Label htmlFor="register-confirm-password">Confirmar senha</Label>
          <Input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Repita sua senha"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p id="register-confirm-error" className="text-xs font-medium text-destructive">
              {errors.confirmPassword.message}
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
              Criando conta...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
              Criar conta
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
