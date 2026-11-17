import { Router } from 'express';
import { getRouteMetrics } from '../controllers/routes.controller';

const router: Router = Router();

router.get('/:routeId/metrics', getRouteMetrics);

export default router;
