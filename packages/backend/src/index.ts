import { app } from './app';
import { config } from './config';
import { prismaService } from './services/prisma.service';

const server = app.listen(config.port, async () => {
  console.log(`🚀 Delhi Transport Backend API running on port ${config.port}`);
  console.log(`   Health check: http://localhost:${config.port}/api/v1/health`);
  console.log(`   Journey Planner: POST http://localhost:${config.port}/api/v1/journeys/plan`);

  const dbStatus = await prismaService.checkConnection();
  console.log(`   Database Status: ${dbStatus.status} (${dbStatus.message || 'OK'})`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await prismaService.disconnect();
    process.exit(0);
  });
});
