/**
 * Basic usage example for IDX MCP Server
 */

import { getDataSourceManager, logger } from '../src';

async function basicUsageExample() {
  try {
    logger.info('Starting IDX MCP Server basic usage example...');
    
    // Initialize data source manager
    const dataManager = getDataSourceManager();
    
    // Example 1: Get market overview
    logger.info('\n1. Getting market overview...');
    const marketData = await dataManager.getMarketOverview();
    if (marketData) {
      logger.info(`IHSG: ${marketData.ihsgValue} (${marketData.ihsgChangePercent.toFixed(2)}%)`);
      logger.info(`Market Status: ${marketData.marketStatus}`);
      logger.info(`Trading Volume: ${marketData.tradingVolume.toLocaleString()}`);
      
      if (marketData.topGainers.length > 0) {
        logger.info('Top Gainers:');
        marketData.topGainers.forEach(stock => {
          logger.info(`  ${stock.ticker}: ${stock.changePercent.toFixed(2)}%`);
        });
      }
    } else {
      logger.warn('No market data available');
    }
    
    // Example 2: Get stock information
    logger.info('\n2. Getting stock information for BBCA...');
    const stockData = await dataManager.getStockInfo('BBCA');
    if (stockData) {
      logger.info(`Stock: ${stockData.name} (${stockData.ticker})`);
      logger.info(`Price: ${stockData.currentPrice} (${stockData.priceChangePercent.toFixed(2)}%)`);
      logger.info(`Volume: ${stockData.volume.toLocaleString()}`);
      logger.info(`Market Cap: ${stockData.marketCap?.toLocaleString() || 'N/A'}`);
      logger.info(`P/E Ratio: ${stockData.peRatio || 'N/A'}`);
    } else {
      logger.warn('No stock data available for BBCA');
    }
    
    // Example 3: Get historical data
    logger.info('\n3. Getting historical data for TLKM (1 month)...');
    const historicalData = await dataManager.getHistoricalData('TLKM', '1m');
    if (historicalData && historicalData.data.length > 0) {
      logger.info(`Historical data for ${historicalData.ticker}:`);
      logger.info(`Period: ${historicalData.period}`);
      logger.info(`Data points: ${historicalData.data.length}`);
      
      // Show first and last data points
      const firstPoint = historicalData.data[0];
      const lastPoint = historicalData.data[historicalData.data.length - 1];
      
      logger.info(`First: ${firstPoint?.date} - Close: ${firstPoint?.close}`);
      logger.info(`Last: ${lastPoint?.date} - Close: ${lastPoint?.close}`);
      
      if (firstPoint && lastPoint) {
        const change = ((lastPoint.close - firstPoint.close) / firstPoint.close) * 100;
        logger.info(`Period change: ${change.toFixed(2)}%`);
      }
    } else {
      logger.warn('No historical data available for TLKM');
    }
    
    // Example 4: Get sector performance
    logger.info('\n4. Getting sector performance...');
    const sectorData = await dataManager.getSectorPerformance();
    if (sectorData) {
      logger.info('Sector Performance:');
      logger.info(`Best Sector: ${sectorData.bestSector}`);
      logger.info(`Worst Sector: ${sectorData.worstSector}`);
      
      Object.entries(sectorData.sectors).forEach(([sectorName, sector]) => {
        logger.info(`  ${sectorName}: ${sector.performance.toFixed(2)}% (${sector.count} stocks)`);
      });
    } else {
      logger.warn('No sector data available');
    }
    
    // Example 5: Search stocks
    logger.info('\n5. Searching for banks...');
    const searchResults = await dataManager.searchStocks('bank');
    if (searchResults.length > 0) {
      logger.info(`Found ${searchResults.length} matches:`);
      searchResults.forEach(result => {
        logger.info(`  ${result.ticker}: ${result.name}`);
        if (result.currentPrice) {
          logger.info(`    Price: ${result.currentPrice} (${result.changePercent?.toFixed(2)}%)`);
        }
      });
    } else {
      logger.warn('No search results found');
    }
    
    logger.info('\nBasic usage example completed successfully!');
    
  } catch (error) {
    logger.error('Error in basic usage example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  basicUsageExample()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Example failed:', error);
      process.exit(1);
    });
}

export { basicUsageExample };