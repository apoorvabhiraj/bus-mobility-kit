import { Request, Response } from 'express';
import { journeyService } from '../services/journey.service';
import { StopSearchQuery, StopSearchResponseSchema } from '../schemas/stops.schema';

export function searchStops(req: Request, res: Response): void {
  const query = req.query as unknown as StopSearchQuery;
  const result = journeyService.searchStops(
    query.query,
    query.lat,
    query.lon,
    query.limit
  );

  const validated = StopSearchResponseSchema.parse(result);
  res.status(200).json(validated);
}
