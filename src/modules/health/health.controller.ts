import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

type LivenessResponse = {
  environment: string;
  service: 'vekko-api';
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
};

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
    private readonly redisHealthIndicator: RedisHealthIndicator,
  ) {}

  @ApiOkResponse({ description: 'O processo da API está disponível.' })
  @Get('live')
  liveness(): LivenessResponse {
    return {
      environment: this.configService.getOrThrow<string>('app.environment'),
      service: 'vekko-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '0.1.0',
    };
  }

  @ApiOkResponse({
    description: 'PostgreSQL e Redis estão disponíveis.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Uma dependência obrigatória está indisponível.',
  })
  @Get('ready')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    const timeout = this.configService.getOrThrow<number>(
      'health.dependencyTimeoutMs',
    );

    return this.healthCheckService.check([
      () =>
        this.prismaHealthIndicator.pingCheck('postgresql', this.prismaService, {
          timeout,
        }),
      () => this.redisHealthIndicator.pingCheck('redis', timeout),
    ]);
  }
}
