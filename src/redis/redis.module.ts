import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createApplicationRedisOptions } from './redis-connection.factory';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  exports: [RedisService],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis =>
        new Redis(
          createApplicationRedisOptions({
            connectTimeoutMs: configService.getOrThrow<number>(
              'redis.connectTimeoutMs',
            ),
            url: configService.getOrThrow<string>('redis.url'),
          }),
        ),
    },
    RedisService,
  ],
})
export class RedisModule {}
