/**
 * Configuration management for IDX MCP Server
 */

import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import type { AppConfig } from '../types';

const ConfigSchema = z.object({
  server: z.object({
    name: z.string().default('Baguskto Saham'),
    version: z.string().default('1.0.0'),
    debug: z.boolean().default(false)
  }),
  cache: z.object({
    type: z.enum(['memory', 'redis']).default('memory'),
    url: z.string().optional(),
    ttl: z.object({
      marketOverview: z.number().default(60),
      stockInfo: z.number().default(300),
      historical: z.number().default(86400),
      sector: z.number().default(300),
      static: z.number().default(604800)
    })
  }),
  dataSources: z.object({
    yahooFinance: z.object({
      timeout: z.number().default(10000),
      maxRetries: z.number().default(3),
      retryDelay: z.number().default(1000)
    }),
    webScraping: z.object({
      timeout: z.number().default(15000),
      maxRetries: z.number().default(3),
      retryDelay: z.number().default(1000)
    }),
    rateLimiting: z.object({
      requestsPerMinute: z.number().default(60),
      burstLimit: z.number().default(10)
    })
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    file: z.string().optional()
  }),
  data: z.object({
    stockListFile: z.string().default('data/idx_stocks.csv'),
    sectorMappingFile: z.string().default('data/sector_mapping.csv')
  })
});

export class Config {
  private static instance: Config;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): AppConfig {
    // Default configuration
    const defaultConfig = {
      server: {
        name: process.env['IDX_MCP_SERVER_NAME'] || 'Baguskto Saham',
        version: process.env['IDX_MCP_SERVER_VERSION'] || '1.0.0',
        debug: process.env['IDX_MCP_DEBUG'] === 'true' || false
      },
      cache: {
        type: (process.env['IDX_MCP_CACHE_TYPE'] as 'memory' | 'redis') || 'memory',
        url: process.env['IDX_MCP_REDIS_URL'],
        ttl: {
          marketOverview: parseInt(process.env['IDX_MCP_CACHE_TTL_MARKET_OVERVIEW'] || '60'),
          stockInfo: parseInt(process.env['IDX_MCP_CACHE_TTL_STOCK_INFO'] || '300'),
          historical: parseInt(process.env['IDX_MCP_CACHE_TTL_HISTORICAL'] || '86400'),
          sector: parseInt(process.env['IDX_MCP_CACHE_TTL_SECTOR'] || '300'),
          static: parseInt(process.env['IDX_MCP_CACHE_TTL_STATIC'] || '604800')
        }
      },
      dataSources: {
        yahooFinance: {
          timeout: parseInt(process.env['IDX_MCP_YAHOO_TIMEOUT'] || '10000'),
          maxRetries: parseInt(process.env['IDX_MCP_MAX_RETRIES'] || '3'),
          retryDelay: parseInt(process.env['IDX_MCP_RETRY_DELAY'] || '1000')
        },
        webScraping: {
          timeout: parseInt(process.env['IDX_MCP_WEB_TIMEOUT'] || '15000'),
          maxRetries: parseInt(process.env['IDX_MCP_MAX_RETRIES'] || '3'),
          retryDelay: parseInt(process.env['IDX_MCP_RETRY_DELAY'] || '1000')
        },
        rateLimiting: {
          requestsPerMinute: parseInt(process.env['IDX_MCP_REQUESTS_PER_MINUTE'] || '60'),
          burstLimit: parseInt(process.env['IDX_MCP_BURST_LIMIT'] || '10')
        }
      },
      logging: {
        level: (process.env['IDX_MCP_LOG_LEVEL'] as 'error' | 'warn' | 'info' | 'debug') || 'info',
        file: process.env['IDX_MCP_LOG_FILE']
      },
      data: {
        stockListFile: process.env['IDX_MCP_STOCK_LIST_FILE'] || 'data/idx_stocks.csv',
        sectorMappingFile: process.env['IDX_MCP_SECTOR_MAPPING_FILE'] || 'data/sector_mapping.csv'
      }
    };

    // Validate configuration
    const result = ConfigSchema.safeParse(defaultConfig);
    if (!result.success) {
      throw new Error(`Configuration validation failed: ${result.error.message}`);
    }

    return result.data;
  }

  public get(): AppConfig {
    return this.config;
  }

  public getServer() {
    return this.config.server;
  }

  public getCache() {
    return this.config.cache;
  }

  public getDataSources() {
    return this.config.dataSources;
  }

  public getLogging() {
    return this.config.logging;
  }

  public getData() {
    return this.config.data;
  }

  public getDataFilePath(relativePath: string): string {
    // If it's already an absolute path, return as-is
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    
    // Try to resolve relative to package directory
    const packageDir = path.dirname(path.dirname(__dirname));
    const packagePath = path.join(packageDir, relativePath);
    
    if (fs.existsSync(packagePath)) {
      return packagePath;
    }
    
    // Try to resolve relative to current working directory
    const cwdPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(cwdPath)) {
      return cwdPath;
    }
    
    // Return the package path as fallback (even if it doesn't exist)
    return packagePath;
  }

  public ensureDirectories(): void {
    try {
      // Create user config directory in home folder for cache/logs
      const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
      const configDir = path.join(homeDir, '.baguskto-saham');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Only create log directory if log file is specified
      if (this.config.logging.file) {
        const logDir = path.dirname(this.config.logging.file.startsWith('/') ? 
          this.config.logging.file : 
          path.join(configDir, this.config.logging.file));
        
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      }
    } catch (error) {
      // Silently fail - the app should work without creating directories
      // Data files are bundled with the package, logs are optional
    }
  }
}

export const config = Config.getInstance();