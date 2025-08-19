/**
 * Base data source implementation
 */

import { logger } from '../utils/logger';
import type {
  StockInfo,
  MarketOverview,
  HistoricalData,
  SectorPerformance,
  SearchResult,
  DataSourcePriority,
  DataSourceStats
} from '../types';

export abstract class DataSource {
  protected name: string;
  protected priority: DataSourcePriority;
  protected timeout: number;
  protected stats: DataSourceStats;

  constructor(name: string, priority: DataSourcePriority, timeout: number = 10000) {
    this.name = name;
    this.priority = priority;
    this.timeout = timeout;
    this.stats = {
      name,
      priority,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      isHealthy: true
    };
  }

  abstract getStockInfo(ticker: string): Promise<StockInfo | null>;
  abstract getMarketOverview(): Promise<MarketOverview | null>;
  abstract getHistoricalData(ticker: string, period: string): Promise<HistoricalData | null>;
  abstract getSectorPerformance(): Promise<SectorPerformance | null>;
  abstract searchStocks(query: string): Promise<SearchResult[]>;

  protected async makeRequest<T>(
    requestName: string,
    requestFn: () => Promise<T>
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      logger.debug(`${this.name}: Starting ${requestName}`);
      
      const result = await Promise.race([
        requestFn(),
        this.createTimeoutPromise<T>()
      ]);
      
      const responseTime = Date.now() - startTime;
      this.updateStats(true, responseTime);
      
      logger.debug(`${this.name}: ${requestName} completed in ${responseTime}ms`);
      this.stats.lastRequest = new Date();
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(false, responseTime);
      
      logger.error(`${this.name}: ${requestName} failed in ${responseTime}ms:`, error);
      this.stats.lastRequest = new Date();
      
      return null;
    }
  }

  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${this.name}: Request timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
  }

  private updateStats(success: boolean, responseTime: number): void {
    if (success) {
      this.stats.successCount++;
    } else {
      this.stats.errorCount++;
    }

    // Update average response time
    const totalRequests = this.stats.successCount + this.stats.errorCount;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;

    // Update health status (consider unhealthy if error rate > 50% in last 10 requests)
    const recentErrorRate = this.stats.errorCount / Math.max(totalRequests, 10);
    this.stats.isHealthy = recentErrorRate <= 0.5;
  }

  public getStats(): DataSourceStats {
    return { ...this.stats };
  }

  public getName(): string {
    return this.name;
  }

  public getPriority(): DataSourcePriority {
    return this.priority;
  }

  public isHealthy(): boolean {
    return this.stats.isHealthy;
  }
}

export class DataSourceManager {
  private sources: DataSource[] = [];

  addSource(source: DataSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => b.getPriority() - a.getPriority());
    logger.info(`Added data source: ${source.getName()} (priority: ${source.getPriority()})`);
  }

  async getStockInfo(ticker: string): Promise<StockInfo | null> {
    return this.tryDataSources(source => source.getStockInfo(ticker));
  }

  async getMarketOverview(): Promise<MarketOverview | null> {
    return this.tryDataSources(source => source.getMarketOverview());
  }

  async getHistoricalData(ticker: string, period: string): Promise<HistoricalData | null> {
    return this.tryDataSources(source => source.getHistoricalData(ticker, period));
  }

  async getSectorPerformance(): Promise<SectorPerformance | null> {
    return this.tryDataSources(source => source.getSectorPerformance());
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    const results = await this.tryDataSources(source => source.searchStocks(query));
    return results || [];
  }

  private async tryDataSources<T>(
    operation: (source: DataSource) => Promise<T | null>
  ): Promise<T | null> {
    // Filter to only healthy sources
    const healthySources = this.sources.filter(source => source.isHealthy());
    
    if (healthySources.length === 0) {
      logger.warn('No healthy data sources available, trying all sources');
      // If no healthy sources, try all sources as fallback
      for (const source of this.sources) {
        try {
          const result = await operation(source);
          if (result) {
            return result;
          }
        } catch (error) {
          logger.debug(`Data source ${source.getName()} failed:`, error);
        }
      }
      return null;
    }

    // Try healthy sources in priority order
    for (const source of healthySources) {
      try {
        const result = await operation(source);
        if (result) {
          return result;
        }
      } catch (error) {
        logger.debug(`Data source ${source.getName()} failed:`, error);
      }
    }

    return null;
  }

  getStats(): Record<string, DataSourceStats> {
    const stats: Record<string, DataSourceStats> = {};
    this.sources.forEach(source => {
      stats[source.getName()] = source.getStats();
    });
    return stats;
  }

  getHealthySources(): DataSource[] {
    return this.sources.filter(source => source.isHealthy());
  }
}