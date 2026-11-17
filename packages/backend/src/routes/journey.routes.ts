import { Router } from 'express';
import { planJourney } from '../controllers/journey.controller';
import { validate } from '../middleware/validate.middleware';
import { JourneyPlanRequestSchema } from '../schemas/journey.schema';

const router: Router = Router();

router.post('/plan', validate(JourneyPlanRequestSchema, 'body'), planJourney);

export default router;
