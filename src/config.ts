import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://ffp:ffp_dev_password@localhost:5432/feature_flags',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isTest: process.env.NODE_ENV === 'test',
  apiKey: process.env.API_KEY ?? 'dev-only-insecure-key',
};
