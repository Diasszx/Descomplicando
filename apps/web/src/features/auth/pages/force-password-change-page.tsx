import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, KeyRound, Loader2, LogOut } from 'lucide-react';
import { ChangePasswordSchema, type ChangePasswordInput } from '@fono/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '../components/auth-layout';
import { PasswordRequirementsHint } from '../components/password-requirements-hint';
import { getDestinationRouteForSession, useAuth } from '../hooks/use-auth';
import { translateFirebaseAuthError } from '../services/firebase-auth.service';

export function ForcePasswordChangePage() {
  const navigate = useNavigate();
  const { completeForcedPasswordChange, logout } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword');

  const onSubmit = async (data: ChangePasswordInput) => {
    setSubmitError(null);
    try {
      const updatedSession = await completeForcedPasswordChange(data);
      navigate(getDestinationRouteForSession(updatedSession), { replace: true });
    } catch (error) {
      setSubmitError(translateFirebaseAuthError(error, 'changePassword'));
    }
  };

  return (
    <AuthLayout
      title="Defina sua nova senha"
      description="No primeiro acesso com credenciais geradas pelo fonoaudiólogo, é obrigatório criar uma senha pessoal."
    >
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="change-current-password">Senha temporária atual</Label>
          <Input
            id="change-current-password"
            type="password"
            autoComplete="current-password"
            placeholder="Informe a senha recebida"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.currentPassword)}
            aria-describedby={errors.currentPassword ? 'change-current-error' : undefined}
            {...register('currentPassword')}
          />
          {errors.currentPassword && (
            <p id="change-current-error" className="text-xs font-medium text-destructive">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="change-new-password">Nova senha</Label>
          <Input
            id="change-new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Crie sua nova senha"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={
              errors.newPassword
                ? 'change-password-requirements change-new-error'
                : 'change-password-requirements'
            }
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p id="change-new-error" className="text-xs font-medium text-destructive">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <PasswordRequirementsHint id="change-password-requirements" password={newPasswordValue} />

        <div className="space-y-1.5">
          <Label htmlFor="change-confirm-password">Confirmar nova senha</Label>
          <Input
            id="change-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.confirmNewPassword)}
            aria-describedby={errors.confirmNewPassword ? 'change-confirm-error' : undefined}
            {...register('confirmNewPassword')}
          />
          {errors.confirmNewPassword && (
            <p id="change-confirm-error" className="text-xs font-medium text-destructive">
              {errors.confirmNewPassword.message}
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
              Salvando nova senha...
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4 mr-2" aria-hidden="true" />
              Salvar nova senha
            </>
          )}
        </Button>

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
      </form>
    </AuthLayout>
  );
}
