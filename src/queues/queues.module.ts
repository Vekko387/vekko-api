import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

function createRedisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  const isTls = url.protocol === 'rediss:';

  return {
    host: url.hostname,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: Number(url.port || 6379),
    tls: isTls ? { servername: url.hostname } : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined,
  };
}

@Global()
@Module({
  exports: [BullModule],
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: createRedisConnection(
          configService.getOrThrow<string>('redis.url'),
        ),
        prefix: configService.getOrThrow<string>('redis.keyPrefix'),
      }),
    }),
  ],
})
export class QueuesModule {}
