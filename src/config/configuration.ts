function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default () => ({
  app: {
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigins: parseCorsOrigins(
      process.env.CORS_ORIGINS ??
        'http://localhost:3001,http://localhost:3002,http://localhost:8081',
    ),
    environment: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    throttle: {
      limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      ttlMs: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
    },
  },
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/vekko',
  },
  redis: {
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'vekko',
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
});
