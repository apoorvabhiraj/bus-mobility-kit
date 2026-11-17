import { Request, Response } from 'express';
import { journeyService } from '../services/journey.service';
import { RouteMetricsResponseSchema } from '../schemas/journey.schema';

export function getRouteMetrics(req: Request, res: Response): void {
  const { routeId } = req.params;
  const metrics = journeyService.getRouteMetrics(routeId);

  if (!metrics) {
    res.status(404).json({
      code: 'ROUTE_NOT_FOUND',
      message: `Transit route with ID or number '${routeId}' not found.`
    });
    return;
  }

  const validated = RouteMetricsResponseSchema.parse(metrics);
  res.status(200).json(validated);
}
