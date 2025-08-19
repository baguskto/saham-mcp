/**
 * Data sources management
 */

import { DataSourceManager } from './base';
import { YahooFinanceSource } from './yahoo-finance';
import { WebScrapingSource } from './web-scraper';
import { GitHubDatasetSource } from './github-dataset';
import { logger } from '../utils/logger';

let dataSourceManager: DataSourceManager;

export function initializeDataSources(): DataSourceManager {
  if (dataSourceManager) {
    return dataSourceManager;
  }

  dataSourceManager = new DataSourceManager();

  // Initialize data sources in priority order
  try {
    // Primary source for historical data: GitHub Dataset
    const githubSource = new GitHubDatasetSource();
    dataSourceManager.addSource(githubSource);
    logger.info('GitHub Dataset-Saham-IDX source initialized');

    // Primary source for live data: Yahoo Finance
    const yahooSource = new YahooFinanceSource();
    dataSourceManager.addSource(yahooSource);
    logger.info('Yahoo Finance data source initialized');

    // Fallback source: Web Scraping
    const webSource = new WebScrapingSource();
    dataSourceManager.addSource(webSource);
    logger.info('Web scraping data source initialized');

  } catch (error) {
    logger.error('Failed to initialize data sources:', error);
    throw error;
  }

  logger.info(`Initialized ${dataSourceManager.getHealthySources().length} data sources`);
  return dataSourceManager;
}

export function getDataSourceManager(): DataSourceManager {
  if (!dataSourceManager) {
    return initializeDataSources();
  }
  return dataSourceManager;
}

export function getDataSourceStats() {
  if (!dataSourceManager) {
    return {};
  }
  return dataSourceManager.getStats();
}