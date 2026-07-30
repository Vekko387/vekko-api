import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { createBullMqRedisOptions } from '../redis/redis-connection.factory';

@Global()
@Module({
  exports: [BullModule],
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: createBullMqRedisOptions({
          connectTimeoutMs: configService.getOrThrow<number>(
            'redis.connectTimeoutMs',
          ),
          url: configService.getOrThrow<string>('redis.url'),
        }),
        prefix: configService.getOrThrow<string>('redis.keyPrefix'),
      }),
    }),
  ],
})
export class QueuesModule {}
