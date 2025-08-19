/**
 * Main MCP Server implementation for IDX stock data
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { config } from '../config';
import { logger } from '../utils/logger';
import { cacheManager, CacheKeyBuilder } from '../cache';
import { getDataSourceManager } from '../data-sources';
import type { MCPResponse, Period } from '../types';

// Request schemas
const GetStockInfoSchema = z.object({
  ticker: z.string().min(1).max(10)
});

const GetHistoricalDataSchema = z.object({
  ticker: z.string().min(1).max(10),
  period: z.enum(['1d', '1w', '1m', '3m', '6m', '1y', '2y', '5y']).default('1y')
});

const SearchStocksSchema = z.object({
  query: z.string().min(2).max(50)
});

const GetStockAnalysisSchema = z.object({
  ticker: z.string().min(1).max(10),
  period: z.enum(['1m', '3m', '6m', '1y', '2y', '5y']).default('1y')
});

const CompareStocksSchema = z.object({
  tickers: z.array(z.string().min(1).max(10)).min(2).max(5),
  period: z.enum(['1m', '3m', '6m', '1y', '2y']).default('1y')
});

export class IDXMCPServer {
  private server: Server;
  private dataManager = getDataSourceManager();

  constructor() {
    const serverConfig = config.getServer();
    
    this.server = new Server(
      {
        name: serverConfig.name,
        version: serverConfig.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_market_overview',
            description: 'Get Indonesian stock market overview including IHSG index, volume, and top movers',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'get_stock_info',
            description: 'Get detailed information for a specific Indonesian stock',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: {
                  type: 'string',
                  description: 'Stock ticker symbol (e.g., BBCA, TLKM)'
                }
              },
              required: ['ticker']
            }
          },
          {
            name: 'get_historical_data',
            description: 'Get historical price data for a specific stock',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: {
                  type: 'string',
                  description: 'Stock ticker symbol'
                },
                period: {
                  type: 'string',
                  enum: ['1d', '1w', '1m', '3m', '6m', '1y', '2y', '5y'],
                  description: 'Time period for historical data',
                  default: '1y'
                }
              },
              required: ['ticker']
            }
          },
          {
            name: 'get_sector_performance',
            description: 'Get performance data for all IDX sectors',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'search_stocks',
            description: 'Search for stocks by company name or ticker symbol',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (company name or partial ticker)'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_stock_analysis',
            description: 'Get comprehensive technical analysis for a stock with indicators and recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: {
                  type: 'string',
                  description: 'Stock ticker symbol (e.g., BBCA, TLKM)'
                },
                period: {
                  type: 'string',
                  enum: ['1m', '3m', '6m', '1y', '2y', '5y'],
                  description: 'Analysis period',
                  default: '1y'
                }
              },
              required: ['ticker']
            }
          },
          {
            name: 'compare_stocks',
            description: 'Compare performance of multiple stocks over a specified period',
            inputSchema: {
              type: 'object',
              properties: {
                tickers: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of stock ticker symbols to compare',
                  minItems: 2,
                  maxItems: 5
                },
                period: {
                  type: 'string',
                  enum: ['1m', '3m', '6m', '1y', '2y'],
                  description: 'Comparison period',
                  default: '1y'
                }
              },
              required: ['tickers']
            }
          },
          {
            name: 'get_available_stocks',
            description: 'Get list of all available stock tickers in the historical dataset',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'get_dataset_info',
            description: 'Get information about the historical dataset including last update and coverage',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ] satisfies Tool[]
      };
    });

    // Handle resources list
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [] // No resources implemented yet
      };
    });

    // Handle prompts list  
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [] // No prompts implemented yet
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_market_overview':
            return await this.handleMarketOverview();
          
          case 'get_stock_info':
            const stockArgs = GetStockInfoSchema.parse(args);
            return await this.handleStockInfo(stockArgs.ticker);
          
          case 'get_historical_data':
            const histArgs = GetHistoricalDataSchema.parse(args);
            return await this.handleHistoricalData(histArgs.ticker, histArgs.period);
          
          case 'get_sector_performance':
            return await this.handleSectorPerformance();
          
          case 'search_stocks':
            const searchArgs = SearchStocksSchema.parse(args);
            return await this.handleSearchStocks(searchArgs.query);
          
          case 'get_stock_analysis':
            const analysisArgs = GetStockAnalysisSchema.parse(args);
            return await this.handleStockAnalysis(analysisArgs.ticker, analysisArgs.period);
          
          case 'compare_stocks':
            const compareArgs = CompareStocksSchema.parse(args);
            return await this.handleCompareStocks(compareArgs.tickers, compareArgs.period);
          
          case 'get_available_stocks':
            return await this.handleGetAvailableStocks();
          
          case 'get_dataset_info':
            return await this.handleGetDatasetInfo();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool call failed for ${name}:`, error);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                responseTime: 0
              })
            }
          ]
        };
      }
    });
  }

  private async handleMarketOverview() {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = CacheKeyBuilder.marketOverview();
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('get_market_overview', {}, responseTime);
        
        const response: MCPResponse = {
          success: true,
          data: cached,
          source: 'cache',
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Get from data sources
      const marketData = await this.dataManager.getMarketOverview();
      
      if (!marketData) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('get_market_overview', {}, responseTime, 'No data available');
        
        const response: MCPResponse = {
          success: false,
          error: 'Market overview data not available',
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Cache the result
      const ttl = cacheManager.getTtl('marketOverview');
      await cacheManager.set(cacheKey, marketData, ttl);
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_market_overview', {}, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: marketData,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_market_overview', {}, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  private async handleStockInfo(ticker: string) {
    const startTime = Date.now();
    const params = { ticker };
    
    try {
      const cleanTicker = ticker.toUpperCase().trim();
      
      // Check cache first
      const cacheKey = CacheKeyBuilder.stockInfo(cleanTicker);
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('get_stock_info', params, responseTime);
        
        const response: MCPResponse = {
          success: true,
          data: cached,
          source: 'cache',
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Get from data sources
      const stockData = await this.dataManager.getStockInfo(cleanTicker);
      
      if (!stockData) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('get_stock_info', params, responseTime, `Stock ${cleanTicker} not found`);
        
        const response: MCPResponse = {
          success: false,
          error: `Stock information not found for ticker: ${cleanTicker}`,
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Cache the result
      const ttl = cacheManager.getTtl('stockInfo');
      await cacheManager.set(cacheKey, stockData, ttl);
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_stock_info', params, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: stockData,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_stock_info', params, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  private async handleHistoricalData(ticker: string, period: Period) {
    const startTime = Date.now();
    const params = { ticker, period };
    
    try {
      const cleanTicker = ticker.toUpperCase().trim();
      
      // Check cache first
      const cacheKey = CacheKeyBuilder.historicalData(cleanTicker, period);
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('get_historical_data', params, responseTime);
        
        const response: MCPResponse = {
          success: true,
          data: cached,
          source: 'cache',
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Get from data sources
      const historicalData = await this.dataManager.getHistoricalData(cleanTicker, period);
      
      if (!historicalData) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('get_historical_data', params, responseTime, `No historical data for ${cleanTicker}`);
        
        const response: MCPResponse = {
          success: false,
          error: `Historical data not found for ticker: ${cleanTicker}`,
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Cache the result
      const ttl = cacheManager.getTtl('historical');
      await cacheManager.set(cacheKey, historicalData, ttl);
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_historical_data', params, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: historicalData,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_historical_data', params, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  private async handleSectorPerformance() {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = CacheKeyBuilder.sectorPerformance();
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('get_sector_performance', {}, responseTime);
        
        const response: MCPResponse = {
          success: true,
          data: cached,
          source: 'cache',
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Get from data sources
      const sectorData = await this.dataManager.getSectorPerformance();
      
      if (!sectorData) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('get_sector_performance', {}, responseTime, 'No sector data available');
        
        const response: MCPResponse = {
          success: false,
          error: 'Sector performance data not available',
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Cache the result
      const ttl = cacheManager.getTtl('sector');
      await cacheManager.set(cacheKey, sectorData, ttl);
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_sector_performance', {}, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: sectorData,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_sector_performance', {}, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  private async handleSearchStocks(query: string) {
    const startTime = Date.now();
    const params = { query };
    
    try {
      const cleanQuery = query.trim();
      
      if (cleanQuery.length < 2) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('search_stocks', params, responseTime, 'Query too short');
        
        const response: MCPResponse = {
          success: false,
          error: 'Search query must be at least 2 characters',
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Check cache first
      const cacheKey = CacheKeyBuilder.stockSearch(cleanQuery);
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        const responseTime = Date.now() - startTime;
        logger.logMcpRequest('search_stocks', params, responseTime);
        
        const response: MCPResponse = {
          success: true,
          data: cached,
          source: 'cache',
          responseTime
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      // Get from data sources
      const searchResults = await this.dataManager.searchStocks(cleanQuery);
      
      const result = {
        query: cleanQuery,
        results: searchResults,
        resultCount: searchResults.length,
        searchTime: new Date().toISOString()
      };

      // Cache the result
      const ttl = cacheManager.getTtl('stockInfo');
      await cacheManager.set(cacheKey, result, ttl);
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('search_stocks', params, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: result,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('search_stocks', params, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  private async handleStockAnalysis(ticker: string, period: string) {
    const startTime = Date.now();
    const params = { ticker, period };
    
    try {
      const cleanTicker = ticker.toUpperCase().trim();
      
      // Import historical data service
      const { HistoricalDataService } = await import('../services/historical-data-service');
      const historicalService = new HistoricalDataService();
      
      // Get historical data
      const stockData = await historicalService.getStockDataForPeriod(cleanTicker, period);
      
      // Import and run technical analysis
      const { TechnicalAnalysis } = await import('../services/technical-analysis');
      const analysis = TechnicalAnalysis.analyzeStock(stockData, cleanTicker, period);
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_stock_analysis', params, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: analysis,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_stock_analysis', params, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  private async handleCompareStocks(tickers: string[], period: string) {
    const startTime = Date.now();
    const params = { tickers, period };
    
    try {
      if (!Array.isArray(tickers) || tickers.length < 2) {
        throw new Error('At least 2 ticker symbols are required for comparison');
      }
      
      if (tickers.length > 5) {
        throw new Error('Maximum 5 stocks can be compared at once');
      }
      
      // Import historical data service
      const { HistoricalDataService } = await import('../services/historical-data-service');
      const historicalService = new HistoricalDataService();
      
      // Get data for all stocks
      const comparisonData = await historicalService.getMultipleStocksData(
        tickers,
        { useCache: true, cacheTTL: 60 * 60 * 1000 }
      );
      
      // Calculate performance metrics
      const comparisons = Object.entries(comparisonData).map(([ticker, data]: [string, any]) => {
        const periodData = data.dataPoints;
        if (periodData.length === 0) return null;
        
        const startPrice = periodData[0].close;
        const endPrice = periodData[periodData.length - 1].close;
        const returnPercent = ((endPrice - startPrice) / startPrice) * 100;
        
        const highs = periodData.map((d: any) => d.high);
        const lows = periodData.map((d: any) => d.low);
        const volumes = periodData.map((d: any) => d.volume).filter((v: any) => v > 0);
        
        return {
          ticker,
          performance: {
            startPrice,
            endPrice,
            returnPercent,
            highestPrice: Math.max(...highs),
            lowestPrice: Math.min(...lows),
            averageVolume: volumes.length > 0 ? volumes.reduce((a: any, b: any) => a + b, 0) / volumes.length : 0
          },
          dataPoints: periodData.length
        };
      }).filter(Boolean);
      
      if (comparisons.length === 0) {
        throw new Error('Reduce of empty array with no initial value');
      }
      
      const result = {
        period,
        comparisons,
        summary: {
          bestPerformer: comparisons.reduce((best, current) => 
            current!.performance.returnPercent > best!.performance.returnPercent ? current : best
          ),
          worstPerformer: comparisons.reduce((worst, current) => 
            current!.performance.returnPercent < worst!.performance.returnPercent ? current : worst
          )
        }
      };
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('compare_stocks', params, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: result,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('compare_stocks', params, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  private async handleGetAvailableStocks() {
    const startTime = Date.now();
    
    try {
      // Import historical data service
      const { HistoricalDataService } = await import('../services/historical-data-service');
      const historicalService = new HistoricalDataService();
      
      const availableStocks = await historicalService.getAvailableStocks();
      
      const result = {
        totalStocks: availableStocks.length,
        stocks: availableStocks.sort(),
        categories: {
          lq45: availableStocks.filter((ticker: string) => 
            ['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'UNVR', 'GGRM', 'KLBF'].includes(ticker)
          ).length,
          banking: availableStocks.filter((ticker: string) => 
            ticker.startsWith('BB') || ticker.includes('BANK')
          ).length
        }
      };
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_available_stocks', {}, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: result,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_available_stocks', {}, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  private async handleGetDatasetInfo() {
    const startTime = Date.now();
    
    try {
      // Import historical data service
      const { HistoricalDataService } = await import('../services/historical-data-service');
      const historicalService = new HistoricalDataService();
      
      const repoInfo = await historicalService.getRepositoryInfo();
      const cachedMetadata = await historicalService.getCachedStockMetadata();
      
      const result = {
        repository: {
          lastUpdated: repoInfo.lastUpdated,
          totalFiles: repoInfo.totalFiles,
          availableStocks: repoInfo.availableStocks.length
        },
        cache: {
          cachedStocks: cachedMetadata.length,
          totalDataPoints: cachedMetadata.reduce((sum: any, meta: any) => sum + meta.dataPoints, 0),
          oldestData: cachedMetadata.length > 0 ? 
            new Date(Math.min(...cachedMetadata.map((m: any) => m.dateRange.start.getTime()))) : null,
          newestData: cachedMetadata.length > 0 ? 
            new Date(Math.max(...cachedMetadata.map((m: any) => m.dateRange.end.getTime()))) : null
        }
      };
      
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_dataset_info', {}, responseTime);
      
      const response: MCPResponse = {
        success: true,
        data: result,
        source: 'live',
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.logMcpRequest('get_dataset_info', {}, responseTime, String(error));
      
      const response: MCPResponse = {
        success: false,
        error: String(error),
        responseTime
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Only log to stderr in MCP mode to avoid interfering with stdio
    console.error('Baguskto Saham MCP Server connected and ready');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }
}

export async function createServer(): Promise<IDXMCPServer> {
  // Ensure configuration is set up
  config.ensureDirectories();
  
  // Initialize data sources
  getDataSourceManager();
  
  logger.info('Creating Baguskto Saham MCP Server...');
  return new IDXMCPServer();
}