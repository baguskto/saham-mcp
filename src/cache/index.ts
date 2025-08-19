/**
 * Caching layer for IDX MCP Server
 */

import NodeCache from 'node-cache';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
}

export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  stats(): Promise<CacheStats>;
}

class MemoryCache implements Cache {
  private cache: NodeCache;
  private hits = 0;
  private misses = 0;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: true,
      deleteOnExpire: true
    });

    this.cache.on('set', (key) => {
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key) => {
      logger.debug(`Cache DEL: ${key}`);
    });

    this.cache.on('expired', (key) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.hits++;
      logger.debug(`Cache HIT: ${key}`);
      return value;
    } else {
      this.misses++;
      logger.debug(`Cache MISS: ${key}`);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const success = this.cache.set(key, value, ttl || 300);
    if (!success) {
      throw new Error(`Failed to set cache key: ${key}`);
    }
  }

  async del(key: string): Promise<void> {
    this.cache.del(key);
  }

  async clear(): Promise<void> {
    this.cache.flushAll();
  }

  async stats(): Promise<CacheStats> {
    const keys = this.cache.keys().length;
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      keys,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }
}

export class CacheKeyBuilder {
  static marketOverview(): string {
    return 'market:overview';
  }

  static stockInfo(ticker: string): string {
    return `stock:info:${ticker.toUpperCase()}`;
  }

  static historicalData(ticker: string, period: string): string {
    return `stock:historical:${ticker.toUpperCase()}:${period}`;
  }

  static sectorPerformance(): string {
    return 'sector:performance';
  }

  static stockSearch(query: string): string {
    return `search:${query.toLowerCase().replace(/\s+/g, '_')}`;
  }

  static static(key: string): string {
    return `static:${key}`;
  }
}

class CacheManager {
  private static instance: CacheManager;
  private cache: Cache;

  private constructor() {
    this.cache = this.createCache();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private createCache(): Cache {
    const cacheConfig = config.getCache();
    
    // For now, only support memory cache
    // Redis support can be added later if needed
    if (cacheConfig.type === 'redis') {
      logger.warn('Redis cache not implemented yet, falling back to memory cache');
    }
    
    return new MemoryCache();
  }

  public async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cache.get<T>(key);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttl);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  public async clear(): Promise<void> {
    try {
      await this.cache.clear();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  public async stats(): Promise<CacheStats> {
    try {
      return await this.cache.stats();
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { hits: 0, misses: 0, keys: 0, hitRate: 0 };
    }
  }

  public getTtl(type: 'marketOverview' | 'stockInfo' | 'historical' | 'sector' | 'static'): number {
    return config.getCache().ttl[type];
  }
}

export const cacheManager = CacheManager.getInstance();