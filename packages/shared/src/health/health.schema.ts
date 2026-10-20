import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.string().trim().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+.*$/, 'Versão deve seguir o formato semver'),
  timestamp: z.string().datetime({ message: 'Timestamp deve ser ISO 8601 datetime' }),
  database: z.enum(['up', 'down']).optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
