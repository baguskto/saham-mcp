#!/usr/bin/env node

/**
 * CLI entry point for IDX MCP Server
 */

import { Command } from 'commander';
import { createServer } from './server';
import { config } from './config';
import { logger } from './utils/logger';
import { cacheManager } from './cache';
import { getDataSourceStats } from './data-sources';

const program = new Command();

program
  .name('baguskto-saham')
  .description('MCP Server untuk data saham Indonesia (IDX)')
  .version('1.0.0');

program
  .command('start')
  .description('Start the MCP server')
  .option('--debug', 'Enable debug mode')
  .action(async (options) => {
    try {
      if (options.debug) {
        process.env['IDX_MCP_DEBUG'] = 'true';
        process.env['IDX_MCP_LOG_LEVEL'] = 'debug';
      }

      logger.info('Starting Baguskto Saham MCP Server...');
      logger.info(`Configuration: ${JSON.stringify(config.get(), null, 2)}`);
      
      const server = await createServer();
      await server.run();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test the data sources and connectivity')
  .action(async () => {
    try {
      logger.info('Testing Baguskto Saham MCP Server components...');
      
      // Test configuration
      logger.info('✓ Configuration loaded');
      
      // Test data sources
      const { getDataSourceManager } = await import('./data-sources');
      const dataManager = getDataSourceManager();
      
      logger.info('Testing market overview...');
      const marketData = await dataManager.getMarketOverview();
      if (marketData) {
        logger.info(`✓ Market overview: IHSG ${marketData.ihsgValue} (${marketData.ihsgChangePercent.toFixed(2)}%)`);
      } else {
        logger.warn('✗ Market overview failed');
      }
      
      logger.info('Testing stock info (BBCA)...');
      const stockData = await dataManager.getStockInfo('BBCA');
      if (stockData) {
        logger.info(`✓ Stock info: ${stockData.name} - ${stockData.currentPrice} (${stockData.priceChangePercent.toFixed(2)}%)`);
      } else {
        logger.warn('✗ Stock info failed');
      }
      
      // Test cache
      logger.info('Testing cache...');
      await cacheManager.set('test_key', { test: 'data' }, 10);
      const cached = await cacheManager.get('test_key');
      if (cached) {
        logger.info('✓ Cache working');
        await cacheManager.del('test_key');
      } else {
        logger.warn('✗ Cache failed');
      }
      
      // Show stats
      const stats = getDataSourceStats();
      logger.info('Data source statistics:');
      for (const [name, stat] of Object.entries(stats)) {
        logger.info(`  ${name}: ${stat.isHealthy ? '✓' : '✗'} healthy, ${stat.successCount} success, ${stat.errorCount} errors`);
      }
      
      const cacheStats = await cacheManager.stats();
      logger.info(`Cache statistics: ${cacheStats.keys} keys, ${cacheStats.hitRate}% hit rate`);
      
      logger.info('Test completed');
      
    } catch (error) {
      logger.error('Test failed:', error);
      process.exit(1);
    }
  });

program
  .command('clear-cache')
  .description('Clear the cache')
  .action(async () => {
    try {
      logger.info('Clearing cache...');
      await cacheManager.clear();
      logger.info('✓ Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show server statistics')
  .action(async () => {
    try {
      logger.info('Baguskto Saham MCP Server Statistics');
      logger.info('========================');
      
      const serverConfig = config.getServer();
      logger.info(`Server: ${serverConfig.name} v${serverConfig.version}`);
      
      const stats = getDataSourceStats();
      logger.info('\nData Sources:');
      for (const [name, stat] of Object.entries(stats)) {
        logger.info(`  ${name}:`);
        logger.info(`    Status: ${stat.isHealthy ? 'Healthy' : 'Unhealthy'}`);
        logger.info(`    Priority: ${stat.priority}`);
        logger.info(`    Requests: ${stat.successCount} success, ${stat.errorCount} errors`);
        logger.info(`    Avg Response Time: ${stat.averageResponseTime.toFixed(2)}ms`);
        if (stat.lastRequest) {
          logger.info(`    Last Request: ${stat.lastRequest.toISOString()}`);
        }
      }
      
      const cacheStats = await cacheManager.stats();
      logger.info('\nCache:');
      logger.info(`  Type: ${config.getCache().type}`);
      logger.info(`  Keys: ${cacheStats.keys}`);
      logger.info(`  Hit Rate: ${cacheStats.hitRate}%`);
      logger.info(`  Hits: ${cacheStats.hits}`);
      logger.info(`  Misses: ${cacheStats.misses}`);
      
    } catch (error) {
      logger.error('Failed to get statistics:', error);
      process.exit(1);
    }
  });

// Check if we should run in MCP mode (default when no specific command is given)
const isStartCommand = process.argv.includes('start');
const hasCommands = process.argv.some(arg => ['test', 'clear-cache', 'stats', 'help', '--help', '-h'].includes(arg));

if (!hasCommands && !isStartCommand) {
  // No command specified, start the server in MCP mode
  // Disable stdout logging for MCP mode to avoid interfering with stdio transport
  process.env['IDX_MCP_LOG_LEVEL'] = 'error';
  
  (async () => {
    try {
      const server = await createServer();
      await server.run();
    } catch (error) {
      // Only log to stderr in MCP mode
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })();
} else {
  program.parse();
}