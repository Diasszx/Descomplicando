import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthSessionResponse } from '@fono/shared';
import { RegisterPage } from './register-page';
import type { AuthContextValue } from '../hooks/use-auth';

const mockUseAuth = vi.fn<() => AuthContextValue>();

vi.mock('../hooks/use-auth', async () => {
  const actual = await vi.importActual<typeof import('../hooks/use-auth')>('../hooks/use-auth');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

function buildAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    firebaseUser: null,
    session: null,
    isBootstrapping: false,
    isAuthenticated: false,
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

describe('RegisterPage (US3 — Cadastro Autônomo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('deve validar critérios mínimos de senha (FR-002) e confirmação antes de enviar', async () => {
    const registerMock = vi.fn();
    mockUseAuth.mockReturnValue(buildAuthValue({ registerAutonomous: registerMock }));

    render(
      <MemoryRouter initialEntries={['/cadastro']}>
        <Routes>
          <Route path="/cadastro" element={<RegisterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Ana Clara' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'semmaiuscula1' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'diferente1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/a senha deve conter pelo menos uma letra maiúscula/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('deve exibir erro explícito quando o e-mail já estiver cadastrado (auth/email-already-in-use ou 409)', async () => {
    const registerMock = vi.fn().mockRejectedValueOnce({ code: 'auth/email-already-in-use' });
    mockUseAuth.mockReturnValue(buildAuthValue({ registerAutonomous: registerMock }));

    render(
      <MemoryRouter initialEntries={['/cadastro']}>
        <Routes>
          <Route path="/cadastro" element={<RegisterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Ana Clara' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'FonoGame1' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'FonoGame1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/este e-mail já está cadastrado/i);
    });
  });

  it('deve bloquear envio duplo em loading e redirecionar para /verificar-email após sucesso', async () => {
    let resolveRegister: (value: AuthSessionResponse) => void = () => undefined;
    const registerMock = vi.fn(
      () =>
        new Promise<AuthSessionResponse>((resolve) => {
          resolveRegister = resolve;
        }),
    );

    mockUseAuth.mockReturnValue(buildAuthValue({ registerAutonomous: registerMock }));

    render(
      <MemoryRouter initialEntries={['/cadastro']}>
        <Routes>
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/verificar-email" element={<div>Tela Verificar E-mail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Ana Clara' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'FonoGame1' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'FonoGame1' },
    });

    const button = screen.getByRole('button', { name: /criar conta/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(registerMock).toHaveBeenCalledTimes(1);
    });

    resolveRegister({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440030',
        name: 'Ana Clara',
        email: 'ana@exemplo.com',
        emailVerified: false,
        role: 'AUTONOMO',
        status: 'ACTIVE',
        mustChangePassword: false,
        mfaRequired: false,
        mfaEnabled: false,
        lastLoginAt: new Date().toISOString(),
      },
      nextStep: 'VERIFY_EMAIL',
      mfaVerifiedForCurrentLogin: false,
    });

    await waitFor(() => {
      expect(screen.getByText('Tela Verificar E-mail')).toBeInTheDocument();
    });
  });
});
