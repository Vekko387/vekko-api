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
    url: process.env.DATABASE_URL,
  },
  firebase: {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
    webApiKey: process.env.FIREBASE_WEB_API_KEY,
  },
  health: {
    dependencyTimeoutMs: Number(
      process.env.DEPENDENCY_HEALTH_TIMEOUT_MS ?? 2_000,
    ),
  },
  location: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    timeoutMs: Number(process.env.GOOGLE_MAPS_GEOCODING_TIMEOUT_MS ?? 5_000),
  },
  redis: {
    connectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 5_000),
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'vekko:development',
    url: process.env.REDIS_URL,
  },
  storage: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    bucket: process.env.R2_BUCKET,
    endpoint: process.env.R2_ENDPOINT,
    prefix: process.env.R2_PREFIX ?? process.env.NODE_ENV ?? 'development',
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
    region: process.env.R2_REGION ?? 'auto',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
