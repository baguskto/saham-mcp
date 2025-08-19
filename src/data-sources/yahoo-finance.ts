/**
 * Yahoo Finance data source implementation
 */

import yahooFinance from 'yahoo-finance2';
import { DataSource } from './base';
import { config } from '../config';
import { logger } from '../utils/logger';
import type {
  StockInfo,
  MarketOverview,
  HistoricalData,
  SectorPerformance,
  SearchResult,
  StockSummary
} from '../types';
import { DataSourcePriority } from '../types';

export class YahooFinanceSource extends DataSource {
  private readonly idxSuffix = '.JK';

  constructor() {
    const dsConfig = config.getDataSources().yahooFinance;
    super('yahoo_finance', DataSourcePriority.HIGH, dsConfig.timeout);
  }

  private getYahooTicker(ticker: string): string {
    const cleanTicker = ticker.toUpperCase().trim();
    return cleanTicker.endsWith(this.idxSuffix) ? cleanTicker : `${cleanTicker}${this.idxSuffix}`;
  }

  // Helper method to convert Yahoo Finance ticker back to IDX format (unused for now)
  // private getIdxTicker(yahooTicker: string): string {
  //   return yahooTicker.replace(this.idxSuffix, '');
  // }

  async getStockInfo(ticker: string): Promise<StockInfo | null> {
    return this.makeRequest(`getStockInfo(${ticker})`, async () => {
      const yahooTicker = this.getYahooTicker(ticker);
      
      // Get quote data
      const quote = await yahooFinance.quote(yahooTicker);
      
      if (!quote || typeof quote.regularMarketPrice !== 'number') {
        throw new Error(`No quote data available for ${ticker}`);
      }

      const currentPrice = quote.regularMarketPrice;
      const previousClose = quote.regularMarketPreviousClose || currentPrice;
      const priceChange = currentPrice - previousClose;
      const priceChangePercent = previousClose > 0 ? (priceChange / previousClose) * 100 : 0;

      return {
        ticker: ticker.toUpperCase(),
        name: quote.longName || quote.shortName || ticker,
        currentPrice,
        priceChange,
        priceChangePercent,
        dayHigh: quote.regularMarketDayHigh || currentPrice,
        dayLow: quote.regularMarketDayLow || currentPrice,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap,
        peRatio: quote.trailingPE,
        week52High: quote.fiftyTwoWeekHigh,
        week52Low: quote.fiftyTwoWeekLow,
        lastUpdated: new Date()
      };
    });
  }

  async getMarketOverview(): Promise<MarketOverview | null> {
    return this.makeRequest('getMarketOverview', async () => {
      // Get IHSG (Jakarta Composite Index) data
      const ihsgQuote = await yahooFinance.quote('^JKSE');
      
      if (!ihsgQuote || typeof ihsgQuote.regularMarketPrice !== 'number') {
        throw new Error('No IHSG data available');
      }

      const currentValue = ihsgQuote.regularMarketPrice;
      const previousClose = ihsgQuote.regularMarketPreviousClose || currentValue;
      const change = currentValue - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      // Get sample of top stocks for gainers/losers
      const topStocks = await this.getTopStocksSample();

      return {
        ihsgValue: currentValue,
        ihsgChange: change,
        ihsgChangePercent: changePercent,
        tradingVolume: ihsgQuote.regularMarketVolume || 0,
        tradingValue: 0, // Not available from Yahoo Finance
        marketStatus: this.getMarketStatus(),
        topGainers: topStocks.gainers,
        topLosers: topStocks.losers,
        foreignNetFlow: undefined, // Not available from Yahoo Finance
        lastUpdated: new Date()
      };
    });
  }

  private async getTopStocksSample(): Promise<{ gainers: StockSummary[]; losers: StockSummary[] }> {
    const sampleTickers = ['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'UNVR'];
    const gainers: StockSummary[] = [];
    const losers: StockSummary[] = [];

    const promises = sampleTickers.map(async (ticker) => {
      try {
        const stockInfo = await this.getStockInfo(ticker);
        if (stockInfo) {
          const summary: StockSummary = {
            ticker,
            name: stockInfo.name,
            price: stockInfo.currentPrice,
            changePercent: stockInfo.priceChangePercent
          };

          if (stockInfo.priceChangePercent > 0) {
            gainers.push(summary);
          } else if (stockInfo.priceChangePercent < 0) {
            losers.push(summary);
          }
        }
      } catch (error) {
        logger.debug(`Failed to get sample stock ${ticker}:`, error);
      }
    });

    await Promise.all(promises);

    // Sort and limit to top 5
    gainers.sort((a, b) => b.changePercent - a.changePercent);
    losers.sort((a, b) => a.changePercent - b.changePercent);

    return {
      gainers: gainers.slice(0, 5),
      losers: losers.slice(0, 5)
    };
  }

  private getMarketStatus(): 'open' | 'closed' | 'pre-market' {
    // Jakarta timezone (UTC+7)
    const now = new Date();
    const jakartaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    // IDX trading hours: 09:00 - 15:50 WIB (Monday-Friday)
    const day = jakartaTime.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    if (day === 0 || day === 6) { // Weekend
      return 'closed';
    }

    const hours = jakartaTime.getUTCHours();
    const minutes = jakartaTime.getUTCMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const marketOpen = 9 * 60; // 09:00
    const marketClose = 15 * 60 + 50; // 15:50
    const preMarketStart = 8 * 60; // 08:00

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
      const yahooTicker = this.getYahooTicker(ticker);
      
      // Get historical data using start date
      logger.debug(`Getting historical data for ${yahooTicker}, period: ${period}`);
      
      const historical = await yahooFinance.historical(yahooTicker, {
        period1: this.getPeriodStartDate(period),
        interval: '1d'
      });

      if (!historical || historical.length === 0) {
        throw new Error(`No historical data available for ${ticker}`);
      }

      const data = historical.map(item => ({
        date: item.date ? item.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume || 0
      }));

      const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      return {
        ticker: ticker.toUpperCase(),
        period,
        dataPoints: sortedData,
        totalPoints: sortedData.length,
        startDate: sortedData[0]?.date || '',
        endDate: sortedData[sortedData.length - 1]?.date || '',
        source: 'Yahoo Finance',
        lastUpdated: new Date().toISOString()
      };
    });
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '1w':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1m':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2y':
        startDate.setFullYear(now.getFullYear() - 2);
        break;
      case '5y':
        startDate.setFullYear(now.getFullYear() - 5);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return startDate;
  }

  async getSectorPerformance(): Promise<SectorPerformance | null> {
    return this.makeRequest('getSectorPerformance', async () => {
      // Yahoo Finance doesn't provide IDX sector data directly
      // This is a simplified implementation using sample stocks
      const sectors = {
        Banking: { tickers: ['BBCA', 'BBRI', 'BMRI'], performance: 0, count: 0 },
        Telecommunications: { tickers: ['TLKM', 'EXCL'], performance: 0, count: 0 },
        Consumer: { tickers: ['UNVR', 'INDF'], performance: 0, count: 0 },
        Mining: { tickers: ['ADRO', 'PTBA'], performance: 0, count: 0 }
      };

      for (const [sectorName, sectorData] of Object.entries(sectors)) {
        const performances: number[] = [];
        
        for (const ticker of sectorData.tickers) {
          try {
            const stockInfo = await this.getStockInfo(ticker);
            if (stockInfo) {
              performances.push(stockInfo.priceChangePercent);
            }
          } catch (error) {
            logger.debug(`Failed to get stock ${ticker} for sector ${sectorName}:`, error);
          }
        }

        if (performances.length > 0) {
          sectorData.performance = performances.reduce((a, b) => a + b, 0) / performances.length;
          sectorData.count = performances.length;
        }
      }

      // Find best and worst sectors
      const sectorEntries = Object.entries(sectors);
      const sortedSectors = sectorEntries.sort((a, b) => b[1].performance - a[1].performance);
      
      const bestSector = sortedSectors[0]?.[0] || 'Unknown';
      const worstSector = sortedSectors[sortedSectors.length - 1]?.[0] || 'Unknown';

      return {
        sectors,
        bestSector,
        worstSector,
        lastUpdated: new Date()
      };
    });
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    const result = await this.makeRequest(`searchStocks(${query})`, async () => {
      // Yahoo Finance doesn't have a good search API for IDX
      // This is a simple implementation using common stocks
      const commonStocks = {
        BBCA: 'Bank Central Asia Tbk PT',
        BBRI: 'Bank Rakyat Indonesia Tbk PT',
        BMRI: 'Bank Mandiri Tbk PT',
        TLKM: 'Telkom Indonesia Tbk PT',
        ASII: 'Astra International Tbk PT',
        UNVR: 'Unilever Indonesia Tbk PT',
        INDF: 'Indofood Sukses Makmur Tbk PT',
        ADRO: 'Adaro Energy Tbk PT',
        PTBA: 'Tambang Batubara Bukit Asam Tbk PT'
      };

      const queryLower = query.toLowerCase();
      const matches: SearchResult[] = [];

      for (const [ticker, name] of Object.entries(commonStocks)) {
        if (ticker.toLowerCase().includes(queryLower) || 
            name.toLowerCase().includes(queryLower)) {
          
          try {
            const stockInfo = await this.getStockInfo(ticker);
            matches.push({
              ticker,
              name,
              currentPrice: stockInfo?.currentPrice || undefined,
              changePercent: stockInfo?.priceChangePercent || undefined
            });
          } catch (error) {
            matches.push({
              ticker,
              name,
              currentPrice: undefined,
              changePercent: undefined
            });
          }
        }
      }

      return matches.slice(0, 10); // Limit to top 10 matches
    });
    return result || [];
  }
}