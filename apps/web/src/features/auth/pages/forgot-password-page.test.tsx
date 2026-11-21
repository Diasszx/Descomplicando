import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ForgotPasswordPage } from './forgot-password-page';
import type { AuthContextValue } from '../hooks/use-auth';

const mockUseAuth = vi.fn<() => AuthContextValue>();

vi.mock('../hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

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

describe('ForgotPasswordPage (US4 — Recuperação de Senha Neutra)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('deve validar e-mail e exibir a mesma mensagem neutra de confirmação sem revelar existência da conta', async () => {
    const resetMock = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(buildAuthValue({ requestPasswordReset: resetMock }));

    render(
      <MemoryRouter initialEntries={['/recuperar-senha']}>
        <Routes>
          <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'invalido' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar instruções/i }));

    await waitFor(() => {
      expect(screen.getByText(/endereço de e-mail válido/i)).toBeInTheDocument();
    });
    expect(resetMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'inexistente@exemplo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar instruções/i }));

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledWith({ email: 'inexistente@exemplo.com' });
      expect(
        screen.getByText(/se o endereço informado estiver cadastrado/i),
      ).toBeInTheDocument();
    });
  });

  it('deve exibir confirmação neutra também quando o erro de backend for auth/user-not-found', async () => {
    const resetMock = vi.fn().mockRejectedValueOnce({ code: 'auth/user-not-found' });
    mockUseAuth.mockReturnValue(buildAuthValue({ requestPasswordReset: resetMock }));

    render(
      <MemoryRouter initialEntries={['/recuperar-senha']}>
        <Routes>
          <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'naoexiste@exemplo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar instruções/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/se o endereço informado estiver cadastrado/i),
      ).toBeInTheDocument();
    });
  });
});
