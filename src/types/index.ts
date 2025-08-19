/**
 * Type definitions for IDX MCP Server
 */

export interface StockInfo {
  ticker: string;
  name: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number | undefined;
  peRatio?: number | undefined;
  week52High?: number | undefined;
  week52Low?: number | undefined;
  lastUpdated: Date;
}

export interface MarketOverview {
  ihsgValue: number;
  ihsgChange: number;
  ihsgChangePercent: number;
  tradingVolume: number;
  tradingValue: number;
  marketStatus: 'open' | 'closed' | 'pre-market';
  topGainers: StockSummary[];
  topLosers: StockSummary[];
  foreignNetFlow?: number | undefined;
  lastUpdated: Date;
}

export interface StockSummary {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface HistoricalData {
  ticker: string;
  period: string;
  dataPoints: HistoricalDataPoint[];
  totalPoints: number;
  startDate: string;
  endDate: string;
  source?: string;
  lastUpdated: string;
}

export interface SectorData {
  performance: number;
  count: number;
  tickers: string[];
}

export interface SectorPerformance {
  sectors: Record<string, SectorData>;
  bestSector: string;
  worstSector: string;
  lastUpdated: Date;
}

export interface SearchResult {
  ticker: string;
  name: string;
  sector?: string;
  market?: string;
  currentPrice?: number | undefined;
  changePercent?: number | undefined;
}

export interface ServerStats {
  server: {
    name: string;
    version: string;
    status: string;
    timestamp: string;
  };
  dataSources: Record<string, any>;
  cache: {
    hits: number;
    misses: number;
    keys: number;
  };
  settings: {
    cacheType: string;
    debugMode: boolean;
    logLevel: string;
  };
}

export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source?: 'cache' | 'live';
  responseTime: number;
}

export interface CacheConfig {
  type: 'memory' | 'redis';
  url?: string | undefined;
  ttl: {
    marketOverview: number;
    stockInfo: number;
    historical: number;
    sector: number;
    static: number;
  };
}

export interface DataSourceConfig {
  yahooFinance: {
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  };
  webScraping: {
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  };
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export interface AppConfig {
  server: {
    name: string;
    version: string;
    debug: boolean;
  };
  cache: CacheConfig;
  dataSources: DataSourceConfig;
  logging: {
    level: string;
    file?: string | undefined;
  };
  data: {
    stockListFile: string;
    sectorMappingFile: string;
  };
}

export type Period = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '2y' | '5y';

export enum DataSourcePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3
}

export interface DataSourceStats {
  name: string;
  priority: DataSourcePriority;
  lastRequest?: Date;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  isHealthy: boolean;
}

export interface StockListItem {
  ticker: string;
  name: string;
  sector: string;
  marketCapBillion: number;
}