import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '../../../redis/redis.service';
import { RedisHealthIndicator } from './redis.health-indicator';

describe('RedisHealthIndicator', () => {
  const healthIndicatorService = new HealthIndicatorService();
  let ping: jest.Mock;
  let indicator: RedisHealthIndicator;

  beforeEach(() => {
    ping = jest.fn();
    indicator = new RedisHealthIndicator(healthIndicatorService, {
      ping,
    } as unknown as RedisService);
  });

  it('reports Redis as up when PING succeeds', async () => {
    ping.mockResolvedValue(undefined);

    await expect(indicator.pingCheck('redis', 50)).resolves.toEqual({
      redis: { status: 'up' },
    });
  });

  it('reports Redis as down without exposing the connection error', async () => {
    ping.mockRejectedValue(
      new Error('redis://user:secret@internal.example:6379'),
    );

    await expect(indicator.pingCheck('redis', 50)).resolves.toEqual({
      redis: { status: 'down' },
    });
  });

  it('reports Redis as down when the check times out', async () => {
    ping.mockReturnValue(new Promise(() => undefined));

    await expect(indicator.pingCheck('redis', 5)).resolves.toEqual({
      redis: { status: 'down' },
    });
  });
});
