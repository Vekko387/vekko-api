import type { ConnectionOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

type RedisConnectionSettings = {
  connectTimeoutMs: number;
  url: string;
};

function parseRedisConnection({
  connectTimeoutMs,
  url: redisUrl,
}: RedisConnectionSettings): RedisOptions {
  const url = new URL(redisUrl);
  const databasePath = url.pathname.replace('/', '');
  const database = databasePath ? Number(databasePath) : 0;

  if (!Number.isInteger(database) || database < 0) {
    throw new Error('REDIS_URL contains an invalid database number.');
  }

  return {
    connectTimeout: connectTimeoutMs,
    db: database,
    family: 0,
    host: url.hostname,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: Number(url.port || 6379),
    tls: url.protocol === 'rediss:' ? { servername: url.hostname } : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined,
  };
}

export function createApplicationRedisOptions(
  settings: RedisConnectionSettings,
): RedisOptions {
  return {
    ...parseRedisConnection(settings),
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  };
}

export function createBullMqRedisOptions(
  settings: RedisConnectionSettings,
): ConnectionOptions {
  return {
    ...parseRedisConnection(settings),
    maxRetriesPerRequest: null,
  };
}
