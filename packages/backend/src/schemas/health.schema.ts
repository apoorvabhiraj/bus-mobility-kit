import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.string().datetime(),
  service: z.string(),
  version: z.string(),
  database: z.object({
    status: z.enum(['connected', 'disconnected', 'mock_fallback']),
    message: z.string().optional()
  }),
  uptimeSeconds: z.number().nonnegative()
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
