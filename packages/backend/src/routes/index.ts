import { Router } from 'express';
import healthRoutes from './health.routes';
import journeyRoutes from './journey.routes';
import stopsRoutes from './stops.routes';
import routesRoutes from './routes.routes';

const router: Router = Router();

router.use('/health', healthRoutes);
router.use('/journeys', journeyRoutes);
router.use('/stops', stopsRoutes);
router.use('/routes', routesRoutes);

export default router;
