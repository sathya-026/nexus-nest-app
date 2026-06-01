import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async setToken(key: string, token: string, ttlSeconds: number = 3600): Promise<void> {
    await this.cacheManager.set(key, token, ttlSeconds);
  }

  async getToken(key: string): Promise<string | null> {
    return await this.cacheManager.get<string>(key);
  }

  async removeToken(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}