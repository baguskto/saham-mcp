/**
 * GitHub Dataset data source for historical Indonesian stock data
 * Integrates with wildangunawan/Dataset-Saham-IDX repository
 */

import { DataSource } from './base';
import { HistoricalDataService } from '../services/historical-data-service';
import { logger } from '../utils/logger';
import type {
  StockInfo,
  MarketOverview,
  HistoricalData,
  SectorPerformance,
  SearchResult
} from '../types';
import { DataSourcePriority } from '../types';

export class GitHubDatasetSource extends DataSource {
  private historicalService: HistoricalDataService;

  constructor() {
    super('GitHub-Dataset-Saham-IDX', DataSourcePriority.HIGH, 15000);
    this.historicalService = new HistoricalDataService();
  }

  async getStockInfo(_ticker: string): Promise<StockInfo | null> {
    // GitHub dataset doesn't provide real-time stock info
    // This should be handled by other data sources like Yahoo Finance
    return null;
  }

  async getMarketOverview(): Promise<MarketOverview | null> {
    // GitHub dataset doesn't provide market overview
    // This should be handled by other data sources
    return null;
  }

  async getHistoricalData(ticker: string, period: string): Promise<HistoricalData | null> {
    return this.makeRequest(`getHistoricalData(${ticker}, ${period})`, async () => {
      try {
        // Check if stock is available in the dataset
        const isAvailable = await this.historicalService.isStockAvailable(ticker);
        if (!isAvailable) {
          logger.debug(`Stock ${ticker} not available in GitHub dataset`);
          return null;
        }

        // Get historical data for the specified period
        const stockData = await this.historicalService.getStockDataForPeriod(
          ticker, 
          period,
          { useCache: true, cacheTTL: 24 * 60 * 60 * 1000 } // 24 hours cache
        );

        if (!stockData || stockData.length === 0) {
          logger.debug(`No historical data found for ${ticker} in period ${period}`);
          return null;
        }

        // Convert to HistoricalData format
        const historicalData: HistoricalData = {
          ticker: ticker.toUpperCase(),
          period,
          dataPoints: stockData.map(point => ({
            date: point.date.toISOString().split('T')[0], // YYYY-MM-DD format
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            volume: point.volume || 0,
            adjustedClose: point.adjustedClose
          })),
          totalPoints: stockData.length,
          startDate: stockData[0]?.date.toISOString().split('T')[0],
          endDate: stockData[stockData.length - 1]?.date.toISOString().split('T')[0],
          source: 'Dataset-Saham-IDX',
          lastUpdated: new Date().toISOString()
        };

        logger.info(`Retrieved ${stockData.length} historical data points for ${ticker} (${period}) from GitHub dataset`);
        return historicalData;

      } catch (error) {
        logger.error(`Failed to get historical data for ${ticker} from GitHub dataset:`, error);
        throw error;
      }
    });
  }

  async getSectorPerformance(): Promise<SectorPerformance | null> {
    // GitHub dataset doesn't provide sector performance
    // This should be handled by other data sources
    return null;
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    const result = await this.makeRequest(`searchStocks(${query})`, async () => {
      try {
        // Get available stocks from the dataset
        const availableStocks = await this.historicalService.getAvailableStocks();
        
        if (!availableStocks || availableStocks.length === 0) {
          return [];
        }

        const queryLower = query.toLowerCase();
        const matchingStocks = availableStocks.filter(ticker => 
          ticker.toLowerCase().includes(queryLower)
        );

        // Convert to SearchResult format
        const results: SearchResult[] = matchingStocks.slice(0, 20).map(ticker => ({
          ticker: ticker.toUpperCase(),
          name: `${ticker.toUpperCase()} - Historical Data Available`,
          sector: 'Unknown', // GitHub dataset doesn't provide company names or sectors
          market: 'IDX'
        }));

        logger.debug(`Found ${results.length} matching stocks for query "${query}" in GitHub dataset`);
        return results;

      } catch (error) {
        logger.error(`Failed to search stocks in GitHub dataset:`, error);
        throw error;
      }
    });

    return result || [];
  }

  /**
   * Get full stock data without period limitation (all available data)
   */
  async getFullStockData(ticker: string): Promise<HistoricalData | null> {
    return this.makeRequest(`getFullStockData(${ticker})`, async () => {
      try {
        // Get all available data for the stock
        const stockData = await this.historicalService.getStockData(
          ticker,
          { useCache: true, cacheTTL: 24 * 60 * 60 * 1000 }
        );

        if (!stockData || stockData.dataPoints.length === 0) {
          return null;
        }

        // Convert to HistoricalData format with all data points
        const historicalData: HistoricalData = {
          ticker: ticker.toUpperCase(),
          period: 'all',
          dataPoints: stockData.dataPoints.map(point => ({
            date: point.date.toISOString().split('T')[0],
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            volume: point.volume || 0,
            adjustedClose: point.adjustedClose
          })),
          totalPoints: stockData.totalPoints,
          startDate: stockData.startDate.toISOString().split('T')[0],
          endDate: stockData.endDate.toISOString().split('T')[0],
          source: 'Dataset-Saham-IDX',
          lastUpdated: new Date().toISOString()
        };

        logger.info(`Retrieved full dataset for ${ticker}: ${stockData.totalPoints} points from ${stockData.startDate.toISOString().split('T')[0]} to ${stockData.endDate.toISOString().split('T')[0]}`);
        return historicalData;

      } catch (error) {
        logger.error(`Failed to get full stock data for ${ticker}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get dataset statistics and information
   */
  async getDatasetInfo() {
    try {
      const repoInfo = await this.historicalService.getRepositoryInfo();
      const cachedMetadata = await this.historicalService.getCachedStockMetadata();
      
      return {
        repository: {
          lastUpdated: repoInfo.lastUpdated,
          totalFiles: repoInfo.totalFiles,
          availableStocks: repoInfo.availableStocks.length
        },
        cache: {
          cachedStocks: cachedMetadata.length,
          totalDataPoints: cachedMetadata.reduce((sum, meta) => sum + meta.dataPoints, 0),
          oldestData: cachedMetadata.length > 0 ? 
            new Date(Math.min(...cachedMetadata.map(m => m.dateRange.start.getTime()))) : null,
          newestData: cachedMetadata.length > 0 ? 
            new Date(Math.max(...cachedMetadata.map(m => m.dateRange.end.getTime()))) : null
        }
      };
    } catch (error) {
      logger.error('Failed to get dataset info:', error);
      throw error;
    }
  }
}