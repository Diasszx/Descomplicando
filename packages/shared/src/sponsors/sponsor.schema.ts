import { z } from 'zod';

export const stakeholderSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome do contato deve ter pelo menos 2 caracteres'),
    role: z.string().trim().min(2, 'Cargo/função deve ter pelo menos 2 caracteres'),
    email: z
      .string()
      .trim()
      .email('Formato de e-mail inválido')
      .optional()
      .or(z.literal('')),
    phone: z
      .string()
      .trim()
      .min(8, 'Telefone deve ter ao menos 8 dígitos')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const hasEmail = Boolean(data.email && data.email.trim().length > 0);
    const hasPhone = Boolean(data.phone && data.phone.trim().length > 0);

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um canal de contato (e-mail ou telefone)',
        path: ['email'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um canal de contato (e-mail ou telefone)',
        path: ['phone'],
      });
    }
  });

export type StakeholderInput = z.infer<typeof stakeholderSchema>;

export const createSponsorSchema = z.object({
  name: z.string().trim().min(3, 'Nome do patrocinador deve ter pelo menos 3 caracteres'),
  document: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  stakeholders: z
    .array(stakeholderSchema)
    .min(1, 'Cadastre ao menos um stakeholder para contato'),
});

export type CreateSponsorInput = z.infer<typeof createSponsorSchema>;

export const sponsorResponseSchema = createSponsorSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SponsorResponse = z.infer<typeof sponsorResponseSchema>;
