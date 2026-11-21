import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthSessionResponse, MfaSetupResponse } from '@fono/shared';
import { MfaSetupPage } from './mfa-setup-page';
import { MfaVerifyPage } from './mfa-verify-page';
import type { AuthContextValue } from '../hooks/use-auth';

const mockUseAuth = vi.fn<() => AuthContextValue>();
const mockSetupMutateAsync = vi.fn<() => Promise<MfaSetupResponse>>();
const mockVerifyMutateAsync = vi.fn<(payload: { code: string }) => Promise<AuthSessionResponse>>();

vi.mock('../hooks/use-auth', async () => {
  const actual = await vi.importActual<typeof import('../hooks/use-auth')>('../hooks/use-auth');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

vi.mock('../hooks/use-auth-session', () => ({
  useMfaSetup: () => ({
    mutateAsync: mockSetupMutateAsync,
    isPending: false,
  }),
  useMfaVerify: () => ({
    mutateAsync: mockVerifyMutateAsync,
    isPending: false,
  }),
}));

function buildSession(overrides: Partial<AuthSessionResponse> = {}): AuthSessionResponse {
  return {
    user: {
      id: '550e8400-e29b-41d4-a716-446655440020',
      name: 'Dra. Carla',
      email: 'carla@fono.com',
      emailVerified: true,
      role: 'PROFISSIONAL',
      status: 'ACTIVE',
      mustChangePassword: false,
      mfaRequired: true,
      mfaEnabled: false,
      lastLoginAt: new Date().toISOString(),
      ...overrides.user,
    },
    nextStep: overrides.nextStep ?? 'MFA_SETUP',
    mfaVerifiedForCurrentLogin: overrides.mfaVerifiedForCurrentLogin ?? false,
  };
}

function buildAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    firebaseUser: null,
    session: buildSession(),
    isBootstrapping: false,
    isAuthenticated: true,
    sessionError: null,
    signIn: vi.fn(),
    registerAutonomous: vi.fn(),
    requestPasswordReset: vi.fn(),
    completeForcedPasswordChange: vi.fn(),
    resendEmailVerification: vi.fn(),
    refreshVerificationStatus: vi.fn(),
    retrySessionSync: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

describe('Páginas de MFA TOTP (US2)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('MfaSetupPage deve exibir QR Code, chave manual, validar 6 dígitos e ativar MFA', async () => {
    mockSetupMutateAsync.mockResolvedValueOnce({
      otpauthUri: 'otpauth://totp/FonoGames:carla%40fono.com?secret=JBSWY3DPEHPK3PXP&issuer=FonoGames',
      manualEntryKey: 'JBSWY3DPEHPK3PXP',
      issuer: 'FonoGames',
      accountName: 'carla@fono.com',
    });
    mockVerifyMutateAsync.mockResolvedValueOnce(
      buildSession({
        user: {
          id: '550e8400-e29b-41d4-a716-446655440020',
          name: 'Dra. Carla',
          email: 'carla@fono.com',
          emailVerified: true,
          role: 'PROFISSIONAL',
          status: 'ACTIVE',
          mustChangePassword: false,
          mfaRequired: true,
          mfaEnabled: true,
          lastLoginAt: new Date().toISOString(),
        },
        nextStep: 'READY',
        mfaVerifiedForCurrentLogin: true,
      }),
    );

    mockUseAuth.mockReturnValue(buildAuthValue());

    render(
      <MemoryRouter initialEntries={['/mfa/configurar']}>
        <Routes>
          <Route path="/mfa/configurar" element={<MfaSetupPage />} />
          <Route path="/profissional" element={<div>Painel Profissional</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      expect(screen.getByLabelText(/qr code para aplicativo autenticador/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /ativar verificação em duas etapas/i }));

    await waitFor(() => {
      expect(screen.getByText(/código numérico de 6 dígitos/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /ativar verificação em duas etapas/i }));

    await waitFor(() => {
      expect(mockVerifyMutateAsync).toHaveBeenCalledWith({ code: '654321' });
      expect(screen.getByText('Painel Profissional')).toBeInTheDocument();
    });
  });

  it('MfaVerifyPage deve submeter código de 6 dígitos, exibir erro em código inválido e mostrar orientação de suporte', async () => {
    mockVerifyMutateAsync.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          statusCode: 400,
          code: 'INVALID_TOTP_CODE',
          message: 'Código de verificação inválido ou expirado.',
        },
      },
    });

    mockUseAuth.mockReturnValue(
      buildAuthValue({
        session: buildSession({ nextStep: 'MFA_VERIFY' }),
      }),
    );

    render(
      <MemoryRouter initialEntries={['/mfa/verificar']}>
        <Routes>
          <Route path="/mfa/verificar" element={<MfaVerifyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/perdeu acesso ao aplicativo autenticador/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/código do aplicativo autenticador/i), {
      target: { value: '111222' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verificar código/i }));

    await waitFor(() => {
      expect(mockVerifyMutateAsync).toHaveBeenCalledWith({ code: '111222' });
      expect(screen.getByRole('alert')).toHaveTextContent(/inválido ou expirado/i);
    });
  });
});
