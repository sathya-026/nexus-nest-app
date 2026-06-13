import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async set(key: string, token: string, ttlSeconds: number = 3600): Promise<void> {
    await this.cacheManager.set(key, token, ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return await this.cacheManager.get<string>(key);
  }

  async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}