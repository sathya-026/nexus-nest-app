import { createKeyv, Keyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KeyvCacheableMemory } from 'cacheable';
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
        const keyvRedis = createKeyv(redisUrl)
  
        return {
          stores: [
            keyvRedis,
            new Keyv({
              store: new KeyvCacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
          ],
          ttl: 300,
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class RedisModule { }
