import {
  createApplicationRedisOptions,
  createBullMqRedisOptions,
} from './redis-connection.factory';

describe('Redis connection factory', () => {
  const settings = {
    connectTimeoutMs: 5_000,
    url: 'rediss://vekko:encoded%20password@redis.internal:6380/2',
  };

  it('parses an application connection with dual-stack DNS', () => {
    expect(createApplicationRedisOptions(settings)).toEqual(
      expect.objectContaining({
        connectTimeout: 5_000,
        db: 2,
        family: 0,
        host: 'redis.internal',
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        password: 'encoded password',
        port: 6380,
        username: 'vekko',
      }),
    );
  });

  it('uses BullMQ-compatible retry behavior', () => {
    expect(createBullMqRedisOptions(settings)).toEqual(
      expect.objectContaining({
        family: 0,
        maxRetriesPerRequest: null,
      }),
    );
  });

  it('rejects an invalid Redis database number', () => {
    expect(() =>
      createApplicationRedisOptions({
        connectTimeoutMs: 5_000,
        url: 'redis://localhost:not-a-port/not-a-database',
      }),
    ).toThrow();
  });
});
