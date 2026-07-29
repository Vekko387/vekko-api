import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorFunction,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheck: jest.MockedFunction<
    (checks: HealthIndicatorFunction[]) => Promise<HealthCheckResult>
  >;
  let postgresqlPingCheck: jest.Mock;
  let redisPingCheck: jest.Mock;
  let submittedChecks: HealthIndicatorFunction[];

  beforeEach(async () => {
    submittedChecks = [];
    healthCheck = jest.fn((checks: HealthIndicatorFunction[]) => {
      submittedChecks = checks;

      return Promise.resolve({
        details: {},
        error: {},
        info: {},
        status: 'ok',
      } satisfies HealthCheckResult);
    });
    postgresqlPingCheck = jest
      .fn()
      .mockResolvedValue({ postgresql: { status: 'up' } });
    redisPingCheck = jest.fn().mockResolvedValue({ redis: { status: 'up' } });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) =>
              key === 'app.environment' ? 'test' : 2_000,
            ),
          },
        },
        {
          provide: HealthCheckService,
          useValue: { check: healthCheck },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: { pingCheck: postgresqlPingCheck },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: RedisHealthIndicator,
          useValue: { pingCheck: redisPingCheck },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns process liveness without dependency details', () => {
    const response = controller.liveness();

    expect(response).toMatchObject({
      environment: 'test',
      service: 'vekko-api',
      status: 'ok',
      version: '0.1.0',
    });
    expect(typeof response.uptimeSeconds).toBe('number');
  });

  it('delegates readiness to PostgreSQL and Redis indicators', async () => {
    await controller.readiness();

    expect(healthCheck).toHaveBeenCalledTimes(1);
    expect(submittedChecks).toHaveLength(2);
  });
});
