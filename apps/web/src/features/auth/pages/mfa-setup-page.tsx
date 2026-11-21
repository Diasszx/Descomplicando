import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  ROLE_HOME_ROUTES,
  TotpCodeSchema,
  type MfaSetupResponse,
  type TotpCodeInput,
} from '@fono/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthLayout } from '../components/auth-layout';
import { getDestinationRouteForSession, useAuth } from '../hooks/use-auth';
import { useMfaSetup, useMfaVerify } from '../hooks/use-auth-session';
import { translateFirebaseAuthError } from '../services/firebase-auth.service';

export function MfaSetupPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const mfaSetupMutation = useMfaSetup();
  const mfaVerifyMutation = useMfaVerify();

  const [setupData, setSetupData] = React.useState<MfaSetupResponse | null>(null);
  const [setupError, setSetupError] = React.useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = React.useState(true);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const isOptionalSetup = Boolean(session && !session.user.mfaRequired && session.nextStep === 'READY');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpCodeInput>({
    resolver: zodResolver(TotpCodeSchema),
    defaultValues: { code: '' },
  });

  const setupMutateAsync = mfaSetupMutation.mutateAsync;
  const copyTimerRef = React.useRef<number | null>(null);

  const loadSetup = React.useCallback(async () => {
    setIsLoadingSetup(true);
    setSetupError(null);
    try {
      const response = await setupMutateAsync();
      setSetupData(response);
    } catch (error) {
      setSetupError(translateFirebaseAuthError(error, 'mfa'));
    } finally {
      setIsLoadingSetup(false);
    }
  }, [setupMutateAsync]);

  const initiatedRef = React.useRef(false);
  React.useEffect(() => {
    if (initiatedRef.current) {
      return;
    }
    initiatedRef.current = true;
    void loadSetup();
  }, [loadSetup]);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyKey = async () => {
    if (!setupData) {
      return;
    }
    try {
      await navigator.clipboard.writeText(setupData.manualEntryKey);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Usuário ainda pode selecionar e copiar manualmente o texto exibido
    }
  };

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
      title="Configurar autenticação em 2 etapas"
      description="Escaneie o QR Code com seu aplicativo autenticador (Google Authenticator, Authy ou equivalente) e informe o código de 6 dígitos."
    >
      {isLoadingSetup && (
        <div className="space-y-4" aria-busy="true" aria-label="Gerando chave de autenticação">
          <div className="flex justify-center">
            <Skeleton className="w-48 h-48 rounded-2xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      )}

      {!isLoadingSetup && setupError && (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <AlertDescription>{setupError}</AlertDescription>
          </Alert>
          <Button
            type="button"
            onClick={() => void loadSetup()}
            className="w-full h-11 rounded-2xl bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            Tentar gerar novamente
          </Button>
        </div>
      )}

      {!isLoadingSetup && setupData && (
        <div className="space-y-5">
          <div className="flex flex-col items-center space-y-3">
            <div
              className="p-4 rounded-2xl border border-border bg-card text-card-foreground dark:bg-foreground dark:text-background shadow-xs"
              aria-label="QR Code para aplicativo autenticador"
              role="img"
            >
              <QRCodeSVG
                value={setupData.otpauthUri}
                size={176}
                bgColor="transparent"
                fgColor="currentColor"
                level="M"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Conta: <strong className="text-foreground">{setupData.accountName}</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                Chave para inserção manual:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCopyKey()}
                className="rounded-xl h-8"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Copiada
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Copiar chave
                  </>
                )}
              </Button>
            </div>
            <code className="block w-full break-all rounded-xl bg-background border border-border px-3 py-2 text-xs font-mono font-bold tracking-wider text-foreground">
              {setupData.manualEntryKey}
            </code>
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-setup-code">Código de 6 dígitos</Label>
              <Input
                id="mfa-setup-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                disabled={isSubmitting}
                className="text-center tracking-[0.35em] font-mono text-base font-bold"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'mfa-setup-code-error' : undefined}
                {...register('code')}
              />
              {errors.code && (
                <p id="mfa-setup-code-error" className="text-xs font-medium text-destructive">
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
                  Validando código...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" aria-hidden="true" />
                  Ativar verificação em duas etapas
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      <div className="pt-1 flex flex-col gap-2">
        {isOptionalSetup && session && (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROLE_HOME_ROUTES[session.user.role], { replace: true })}
            className="w-full h-10 rounded-2xl"
          >
            Voltar ao painel
          </Button>
        )}
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
