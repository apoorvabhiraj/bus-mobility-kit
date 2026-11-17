import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { getHealth } from './controllers/health.controller';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (config.nodeEnv !== 'test') {
    app.use(morgan('combined'));
  }

  // Root health endpoint alias
  app.get('/health', getHealth);

  // Mount API v1 router
  app.use('/api/v1', apiRoutes);

  // Fallbacks
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
