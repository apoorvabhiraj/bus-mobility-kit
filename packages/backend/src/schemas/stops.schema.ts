import { z } from 'zod';
import { StopSchema } from './journey.schema';

export const StopSearchQuerySchema = z.object({
  query: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});
export type StopSearchQuery = z.infer<typeof StopSearchQuerySchema>;

export const StopSearchResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  stops: z.array(StopSchema)
});
export type StopSearchResponse = z.infer<typeof StopSearchResponseSchema>;
