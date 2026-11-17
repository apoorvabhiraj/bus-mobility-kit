import { PrismaClient } from '@prisma/client';
import { config } from '../config';

class PrismaService {
  private static instance: PrismaService;
  public client: PrismaClient;
  private isConnected = false;

  private constructor() {
    this.client = new PrismaClient({
      datasources: config.databaseUrl ? { db: { url: config.databaseUrl } } : undefined,
      log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error']
    });
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  public async checkConnection(): Promise<{ connected: boolean; status: 'connected' | 'mock_fallback'; message?: string }> {
    if (!config.databaseUrl) {
      return {
        connected: false,
        status: 'mock_fallback',
        message: 'DATABASE_URL not configured. Running in high-fidelity mock transit mode.'
      };
    }

    try {
      await this.client.$queryRaw`SELECT 1`;
      this.isConnected = true;
      return { connected: true, status: 'connected' };
    } catch (err: unknown) {
      this.isConnected = false;
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        connected: false,
        status: 'mock_fallback',
        message: `Database connection failed (${errorMessage}). Fallback to mock data active.`
      };
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }
}

export const prismaService = PrismaService.getInstance();
export const prisma = prismaService.client;
