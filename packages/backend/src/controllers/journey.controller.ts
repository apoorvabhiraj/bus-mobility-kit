import { Request, Response } from 'express';
import { journeyService } from '../services/journey.service';
import { JourneyPlanRequest, JourneyPlanResponseSchema } from '../schemas/journey.schema';

export function planJourney(req: Request, res: Response): void {
  const planRequest: JourneyPlanRequest = req.body;
  const result = journeyService.planJourney(planRequest);

  // Validate the response body against Zod contract schema before responding
  const validatedResponse = JourneyPlanResponseSchema.parse(result);
  res.status(200).json(validatedResponse);
}
