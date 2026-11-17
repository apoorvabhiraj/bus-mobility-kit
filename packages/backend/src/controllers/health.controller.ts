import { Request, Response } from 'express';
import { prismaService } from '../services/prisma.service';
import { config } from '../config';
import { HealthResponse } from '../schemas/health.schema';

const startTime = Date.now();

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const dbHealth = await prismaService.checkConnection();
  const uptimeSeconds = Math.round((Date.now() - startTime) / 1000);

  const response: HealthResponse = {
    status: dbHealth.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    service: config.serviceName,
    version: config.apiVersion,
    database: {
      status: dbHealth.connected ? 'connected' : 'mock_fallback',
      message: dbHealth.message
    },
    uptimeSeconds
  };

  res.status(200).json(response);
}
