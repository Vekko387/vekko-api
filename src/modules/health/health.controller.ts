import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

type HealthResponse = {
  environment: string;
  service: 'vekko-api';
  status: 'ok';
  timestamp: string;
  version: string;
};

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @ApiOkResponse({ description: 'A API está disponível.' })
  @Get()
  check(): HealthResponse {
    return {
      environment: this.configService.getOrThrow<string>('app.environment'),
      service: 'vekko-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }
}
