import { Router } from 'express';
import { searchStops } from '../controllers/stops.controller';
import { validate } from '../middleware/validate.middleware';
import { StopSearchQuerySchema } from '../schemas/stops.schema';

const router: Router = Router();

router.get('/', validate(StopSearchQuerySchema, 'query'), searchStops);

export default router;
