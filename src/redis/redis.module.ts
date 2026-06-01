import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (config: ConfigService) => {
        const host = config.get<string>('redis.host');
        const port = config.get<number>('redis.port');
        const password = config.get<string>('redis.password');

        const redisUrl = password
          ? `redis://:${password}@${host}:${port}`
          : `redis://${host}:${port}`;

        const keyvStore = new KeyvRedis(redisUrl);
        return {
          stores: [keyvStore],
          ttl: 300, // Default 5 minutes
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheModule, CacheService],
})
export class RedisModule {}
