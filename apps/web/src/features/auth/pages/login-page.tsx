import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Clock, Loader2, LogIn } from 'lucide-react';
import { LoginSchema, type LoginInput } from '@fono/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthLayout } from '../components/auth-layout';
import { getDestinationRouteForSession, useAuth } from '../hooks/use-auth';
import { translateFirebaseAuthError } from '../services/firebase-auth.service';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const reason = searchParams.get('reason');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitError(null);
    try {
      const session = await signIn(data);
      navigate(getDestinationRouteForSession(session), { replace: true });
    } catch (error) {
      setSubmitError(translateFirebaseAuthError(error, 'login'));
    }
  };

  return (
    <AuthLayout
      title="Entrar na FonoGames"
      description="Informe seu e-mail e senha para acessar seu painel."
      footer={
        <p>
          Ainda não possui conta?{' '}
          <Link
            to="/cadastro"
            className="font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            Criar conta autônoma
          </Link>
        </p>
      }
    >
      {reason === 'inactivity' && (
        <Alert variant="warning">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <AlertTitle>Sessão encerrada por inatividade</AlertTitle>
            <AlertDescription>
              Por segurança em computadores compartilhados, sua sessão foi encerrada após 30 minutos
              sem atividade. Faça login novamente para continuar.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {reason === 'revoked' && (
        <Alert variant="warning">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <AlertTitle>Sessão encerrada</AlertTitle>
            <AlertDescription>
              Sua credencial foi revogada ou encerrada. Faça login novamente para acessar a
              plataforma.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {reason === 'inactive' && (
        <Alert variant="destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <AlertTitle>Conta inativa ou desativada</AlertTitle>
            <AlertDescription>
              Esta conta está inativa ou foi desativada. Entre em contato com o suporte.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="nome@exemplo.com"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="login-email-error" className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Senha</Label>
            <Link
              to="/recuperar-senha"
              className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="login-password-error" className="text-xs font-medium text-destructive">
              {errors.password.message}
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
              Entrando...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
              Entrar
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
