import { describe, it, expect } from 'vitest';
import { createSponsorSchema, stakeholderSchema } from './sponsor.schema';

describe('stakeholderSchema', () => {
  it('deve validar stakeholder com apenas e-mail', () => {
    const valid = stakeholderSchema.safeParse({
      name: 'Maria Silva',
      role: 'Diretora de Parcerias',
      email: 'maria@empresa.com',
      phone: '',
    });
    expect(valid.success).toBe(true);
  });

  it('deve validar stakeholder com apenas telefone', () => {
    const valid = stakeholderSchema.safeParse({
      name: 'João Souza',
      role: 'Financeiro',
      email: '',
      phone: '11999998888',
    });
    expect(valid.success).toBe(true);
  });

  it('deve validar stakeholder com e-mail e telefone', () => {
    const valid = stakeholderSchema.safeParse({
      name: 'Carlos Oliveira',
      role: 'Gerente',
      email: 'carlos@empresa.com',
      phone: '11999998888',
    });
    expect(valid.success).toBe(true);
  });

  it('deve reprovar stakeholder sem e-mail e sem telefone', () => {
    const invalid = stakeholderSchema.safeParse({
      name: 'Carlos Oliveira',
      role: 'Gerente',
      email: '',
      phone: '',
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues.some((issue) => issue.message.includes('ao menos um canal de contato'))).toBe(true);
    }
  });

  it('deve reprovar e-mail com formato inválido', () => {
    const invalid = stakeholderSchema.safeParse({
      name: 'Carlos Oliveira',
      role: 'Gerente',
      email: 'email-invalido',
      phone: '',
    });
    expect(invalid.success).toBe(false);
  });
});

describe('createSponsorSchema', () => {
  it('deve aceitar patrocinador com pelo menos 1 stakeholder válido', () => {
    const result = createSponsorSchema.safeParse({
      name: 'Empresa Alpha',
      document: '12.345.678/0001-90',
      stakeholders: [
        {
          name: 'Renata Lima',
          role: 'Coordenadora',
          email: 'renata@alpha.com',
          phone: '',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('deve aceitar múltiplos stakeholders', () => {
    const result = createSponsorSchema.safeParse({
      name: 'Empresa Beta',
      stakeholders: [
        {
          name: 'Renata Lima',
          role: 'Coordenadora',
          email: 'renata@beta.com',
          phone: '',
        },
        {
          name: 'Pedro Alves',
          role: 'Financeiro',
          email: '',
          phone: '11988887777',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('deve reprovar quando a lista de stakeholders for vazia', () => {
    const result = createSponsorSchema.safeParse({
      name: 'Empresa Gama',
      stakeholders: [],
    });
    expect(result.success).toBe(false);
  });
});
