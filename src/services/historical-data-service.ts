/**
 * Historical Data Service for Indonesian Stock Market data
 * Integrates with Dataset-Saham-IDX repository
 */

import fs from 'fs/promises';
import path from 'path';
import { GitHubApiService, RepositoryInfo } from '../utils/github-api';
import { CSVParser, ParsedStockData, StockDataPoint } from './csv-parser';
import { logger } from '../utils/logger';

export interface HistoricalDataOptions {
  useCache?: boolean;
  cacheTTL?: number; // Cache time-to-live in milliseconds
  forceRefresh?: boolean;
}

export interface StockMetadata {
  ticker: string;
  lastUpdated: Date;
  dataPoints: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  fileSize: number;
}

export class HistoricalDataService {
  private githubApi: GitHubApiService;
  private dataDir: string;
  private metadataDir: string;
  private defaultCacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.githubApi = new GitHubApiService();
    this.dataDir = path.join(process.cwd(), 'data', 'historical');
    this.metadataDir = path.join(process.cwd(), 'data', 'metadata');
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.metadataDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories:', error);
    }
  }

  /**
   * Get historical data for a specific stock
   */
  async getStockData(
    ticker: string, 
    options: HistoricalDataOptions = {}
  ): Promise<ParsedStockData> {
    const { useCache = true, cacheTTL = this.defaultCacheTTL, forceRefresh = false } = options;
    
    ticker = ticker.toUpperCase();
    
    // Check cache first (unless force refresh)
    if (useCache && !forceRefresh) {
      const cachedData = await this.getCachedData(ticker, cacheTTL);
      if (cachedData) {
        logger.info(`Using cached data for ${ticker}`);
        return cachedData;
      }
    }

    // Download fresh data from GitHub
    logger.info(`Downloading fresh data for ${ticker}`);
    const csvData = await this.githubApi.downloadStockData(ticker);
    
    // Parse the CSV data
    const parsedData = CSVParser.parseStockCSV(csvData, ticker);
    
    // Cache the parsed data
    if (useCache) {
      await this.cacheData(ticker, parsedData, csvData);
    }

    return parsedData;
  }

  /**
   * Get historical data for multiple stocks
   */
  async getMultipleStocksData(
    tickers: string[], 
    options: HistoricalDataOptions = {}
  ): Promise<Record<string, ParsedStockData>> {
    const results: Record<string, ParsedStockData> = {};
    
    // Process stocks in parallel (but limit concurrency)
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(tickers, concurrencyLimit);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async ticker => {
        try {
          const data = await this.getStockData(ticker, options);
          results[ticker.toUpperCase()] = data;
        } catch (error) {
          logger.error(`Failed to get data for ${ticker}:`, error);
          // Continue with other stocks
        }
      });
      
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Get available stock tickers from the repository
   */
  async getAvailableStocks(): Promise<string[]> {
    try {
      const info = await this.githubApi.getRepositoryInfo();
      return info.availableStocks;
    } catch (error) {
      logger.error('Failed to get available stocks:', error);
      return [];
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(): Promise<RepositoryInfo> {
    return this.githubApi.getRepositoryInfo();
  }

  /**
   * Check if stock data is available
   */
  async isStockAvailable(ticker: string): Promise<boolean> {
    return this.githubApi.isStockAvailable(ticker);
  }

  /**
   * Get stock data for a specific time period
   */
  async getStockDataForPeriod(
    ticker: string, 
    period: string,
    options: HistoricalDataOptions = {}
  ): Promise<StockDataPoint[]> {
    const fullData = await this.getStockData(ticker, options);
    return CSVParser.getDataForPeriod(fullData, period);
  }

  /**
   * Get stock data for a custom date range
   */
  async getStockDataForDateRange(
    ticker: string,
    startDate: Date,
    endDate: Date,
    options: HistoricalDataOptions = {}
  ): Promise<StockDataPoint[]> {
    const fullData = await this.getStockData(ticker, options);
    return CSVParser.filterByDateRange(fullData, startDate, endDate);
  }

  /**
   * Get metadata for cached stocks
   */
  async getCachedStockMetadata(): Promise<StockMetadata[]> {
    try {
      const files = await fs.readdir(this.metadataDir);
      const metadataFiles = files.filter(f => f.endsWith('.json'));
      
      const metadata: StockMetadata[] = [];
      
      for (const file of metadataFiles) {
        try {
          const filePath = path.join(this.metadataDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const meta = JSON.parse(content) as StockMetadata;
          
          // Convert date strings back to Date objects
          meta.lastUpdated = new Date(meta.lastUpdated);
          meta.dateRange.start = new Date(meta.dateRange.start);
          meta.dateRange.end = new Date(meta.dateRange.end);
          
          metadata.push(meta);
        } catch (error) {
          logger.warn(`Failed to read metadata for ${file}:`, error);
        }
      }
      
      return metadata;
    } catch (error) {
      logger.error('Failed to get cached metadata:', error);
      return [];
    }
  }

  /**
   * Clear cache for a specific stock or all stocks
   */
  async clearCache(ticker?: string): Promise<void> {
    try {
      if (ticker) {
        // Clear specific stock
        ticker = ticker.toUpperCase();
        const dataFile = path.join(this.dataDir, `${ticker}.json`);
        const metadataFile = path.join(this.metadataDir, `${ticker}.json`);
        
        await Promise.all([
          fs.unlink(dataFile).catch(() => {}),
          fs.unlink(metadataFile).catch(() => {})
        ]);
        
        logger.info(`Cleared cache for ${ticker}`);
      } else {
        // Clear all cache
        const [dataFiles, metadataFiles] = await Promise.all([
          fs.readdir(this.dataDir).catch(() => []),
          fs.readdir(this.metadataDir).catch(() => [])
        ]);
        
        const deletePromises = [
          ...dataFiles.map(f => fs.unlink(path.join(this.dataDir, f)).catch(() => {})),
          ...metadataFiles.map(f => fs.unlink(path.join(this.metadataDir, f)).catch(() => {}))
        ];
        
        await Promise.all(deletePromises);
        logger.info('Cleared all cache');
      }
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cached data if available and not expired
   */
  private async getCachedData(ticker: string, cacheTTL: number): Promise<ParsedStockData | null> {
    try {
      const dataFile = path.join(this.dataDir, `${ticker}.json`);
      const metadataFile = path.join(this.metadataDir, `${ticker}.json`);
      
      // Check if files exist
      const [dataStats, metadataStats] = await Promise.all([
        fs.stat(dataFile).catch(() => null),
        fs.stat(metadataFile).catch(() => null)
      ]);
      
      if (!dataStats || !metadataStats) {
        return null;
      }
      
      // Check if cache is expired
      const age = Date.now() - dataStats.mtime.getTime();
      if (age > cacheTTL) {
        logger.debug(`Cache expired for ${ticker} (age: ${age}ms, TTL: ${cacheTTL}ms)`);
        return null;
      }
      
      // Read cached data
      const [dataContent] = await Promise.all([
        fs.readFile(dataFile, 'utf-8'),
        fs.readFile(metadataFile, 'utf-8')
      ]);
      
      const data = JSON.parse(dataContent) as ParsedStockData;
      
      // Convert date strings back to Date objects
      data.startDate = new Date(data.startDate);
      data.endDate = new Date(data.endDate);
      data.dataPoints = data.dataPoints.map(point => ({
        ...point,
        date: new Date(point.date)
      }));
      
      return data;
    } catch (error) {
      logger.debug(`Failed to read cached data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Cache parsed data and metadata
   */
  private async cacheData(ticker: string, data: ParsedStockData, rawCsv: string): Promise<void> {
    try {
      const dataFile = path.join(this.dataDir, `${ticker}.json`);
      const metadataFile = path.join(this.metadataDir, `${ticker}.json`);
      
      // Create metadata
      const metadata: StockMetadata = {
        ticker,
        lastUpdated: new Date(),
        dataPoints: data.totalPoints,
        dateRange: {
          start: data.startDate,
          end: data.endDate
        },
        fileSize: Buffer.byteLength(rawCsv, 'utf-8')
      };
      
      // Write files
      await Promise.all([
        fs.writeFile(dataFile, JSON.stringify(data, null, 2)),
        fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2))
      ]);
      
      logger.debug(`Cached data for ${ticker} (${data.totalPoints} points)`);
    } catch (error) {
      logger.error(`Failed to cache data for ${ticker}:`, error);
    }
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}