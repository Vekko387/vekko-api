import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redisService: RedisService,
  ) {}

  async pingCheck<Key extends string>(
    key: Key,
    timeoutMs: number,
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);
    let timeout: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        this.redisService.ping(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Redis health check timed out.')),
            timeoutMs,
          );
        }),
      ]);

      return check.up();
    } catch {
      return check.down();
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
