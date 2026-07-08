import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';

const PORT = env.PORT;

async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 ChemCheck API running on port ${PORT}`);
      logger.info(`📋 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 CORS origin: ${env.CORS_ORIGIN}`);
    });
  } catch (error) {
    logger.warn('⚠️ Could not connect to the database right now. Proceeding with limited functionality...', error);
    
    app.listen(PORT, () => {
      logger.info(`🚀 ChemCheck API running on port ${PORT} (without DB)`);
      logger.info(`📋 Environment: ${env.NODE_ENV}`);
    });
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();
