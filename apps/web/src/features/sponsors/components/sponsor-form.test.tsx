import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SponsorForm } from './sponsor-form';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('SponsorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o formulário com dados da organização e 1 stakeholder inicial', () => {
    render(<SponsorForm />, { wrapper: createWrapper() });

    expect(screen.getByText('Cadastrar Patrocinador')).toBeDefined();
    expect(screen.getByLabelText(/Nome da Empresa/i)).toBeDefined();
    expect(screen.getByText('Contato / Stakeholder #1')).toBeDefined();
  });

  it('deve adicionar um segundo stakeholder ao clicar em "Adicionar Stakeholder"', () => {
    render(<SponsorForm />, { wrapper: createWrapper() });

    const addButton = screen.getByRole('button', { name: /Adicionar Stakeholder/i });
    fireEvent.click(addButton);

    expect(screen.getByText('Contato / Stakeholder #1')).toBeDefined();
    expect(screen.getByText('Contato / Stakeholder #2')).toBeDefined();
  });

  it('o botão de remover deve estar desabilitado quando houver apenas 1 stakeholder', () => {
    render(<SponsorForm />, { wrapper: createWrapper() });

    const removeButton = screen.getByRole('button', { name: /Remover stakeholder 1/i });
    expect(removeButton).toHaveProperty('disabled', true);
  });
});
