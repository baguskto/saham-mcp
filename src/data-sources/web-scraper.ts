/**
 * Web scraping data source implementation (fallback)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from './base';
import { config } from '../config';
import { logger } from '../utils/logger';
import type {
  StockInfo,
  MarketOverview,
  HistoricalData,
  SectorPerformance,
  SearchResult
} from '../types';
import { DataSourcePriority } from '../types';

export class WebScrapingSource extends DataSource {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  constructor() {
    const dsConfig = config.getDataSources().webScraping;
    super('web_scraping', DataSourcePriority.MEDIUM, dsConfig.timeout);
  }

  private async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    const response = await axios.get(url, {
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    return cheerio.load(response.data);
  }

  async getStockInfo(ticker: string): Promise<StockInfo | null> {
    return this.makeRequest(`getStockInfo(${ticker})`, async () => {
      // This is a simplified implementation
      // In a real implementation, you would scrape from actual IDX or financial websites
      logger.warn(`Web scraping for stock info not fully implemented for ${ticker}`);
      return null;
    });
  }

  async getMarketOverview(): Promise<MarketOverview | null> {
    return this.makeRequest('getMarketOverview', async () => {
      try {
        // Try to scrape from Google Finance for IHSG
        const url = 'https://www.google.com/finance/quote/JKSE:IDX';
        const $ = await this.fetchPage(url);
        
        // This is a basic implementation - the actual selectors would need to be
        // determined by inspecting the actual website structure
        const priceElement = $('[data-last-price]').first();
        const changeElement = $('[data-last-change]').first();
        
        if (priceElement.length === 0) {
          throw new Error('Could not find price data on page');
        }

        const currentValue = parseFloat(priceElement.attr('data-last-price') || '0');
        const changeText = changeElement.text() || '';
        const change = parseFloat(changeText.replace(/[^\d.-]/g, '')) || 0;
        const changePercent = currentValue > 0 ? (change / (currentValue - change)) * 100 : 0;

        return {
          ihsgValue: currentValue,
          ihsgChange: change,
          ihsgChangePercent: changePercent,
          tradingVolume: 0, // Not available from basic scraping
          tradingValue: 0,
          marketStatus: this.getMarketStatus(),
          topGainers: [], // Would require additional scraping
          topLosers: [],
          foreignNetFlow: undefined,
          lastUpdated: new Date()
        };
      } catch (error) {
        logger.debug('Web scraping failed, returning null');
        return null;
      }
    });
  }

  private getMarketStatus(): 'open' | 'closed' | 'pre-market' {
    // Jakarta timezone (UTC+7)
    const now = new Date();
    const jakartaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    const day = jakartaTime.getUTCDay();
    if (day === 0 || day === 6) {
      return 'closed';
    }

    const hours = jakartaTime.getUTCHours();
    const minutes = jakartaTime.getUTCMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const marketOpen = 9 * 60;
    const marketClose = 15 * 60 + 50;
    const preMarketStart = 8 * 60;

    if (timeInMinutes >= marketOpen && timeInMinutes <= marketClose) {
      return 'open';
    } else if (timeInMinutes >= preMarketStart && timeInMinutes < marketOpen) {
      return 'pre-market';
    } else {
      return 'closed';
    }
  }

  async getHistoricalData(ticker: string, period: string): Promise<HistoricalData | null> {
    return this.makeRequest(`getHistoricalData(${ticker}, ${period})`, async () => {
      // Historical data scraping is complex and would require
      // scraping from multiple pages or using different sources
      logger.warn(`Web scraping for historical data not implemented for ${ticker}`);
      return null;
    });
  }

  async getSectorPerformance(): Promise<SectorPerformance | null> {
    return this.makeRequest('getSectorPerformance', async () => {
      // Sector performance would require scraping from IDX website
      // or other financial data providers
      logger.warn('Web scraping for sector performance not implemented');
      return null;
    });
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    const result = await this.makeRequest(`searchStocks(${query})`, async () => {
      // Stock search would require scraping from IDX website
      // or implementing a local search from CSV data
      logger.warn(`Web scraping for stock search not implemented for query: ${query}`);
      return [];
    });
    return result || [];
  }
}