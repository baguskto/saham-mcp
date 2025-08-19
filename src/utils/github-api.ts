/**
 * GitHub API utilities for fetching Dataset-Saham-IDX repository data
 */

import axios from 'axios';
import { logger } from './logger';

export interface GitHubFileInfo {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  download_url: string;
  type: 'file' | 'dir';
}

export interface RepositoryInfo {
  lastUpdated: string;
  totalFiles: number;
  availableStocks: string[];
}

export class GitHubApiService {
  private readonly baseUrl = 'https://api.github.com/repos/wildangunawan/Dataset-Saham-IDX';
  private readonly rawUrl = 'https://raw.githubusercontent.com/wildangunawan/Dataset-Saham-IDX/master';
  
  /**
   * Get list of stock CSV files from LQ45 directory
   */
  async getLQ45StockFiles(): Promise<GitHubFileInfo[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/contents/Saham/LQ45`, {
        timeout: 10000
      });
      
      const files = response.data as GitHubFileInfo[];
      return files.filter(file => file.type === 'file' && file.name.endsWith('.csv'));
    } catch (error) {
      logger.error('Failed to fetch LQ45 stock files:', error);
      throw new Error('Unable to fetch stock file list from GitHub');
    }
  }

  /**
   * Get list of all stock CSV files from Semua directory
   */
  async getAllStockFiles(): Promise<GitHubFileInfo[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/contents/Saham/Semua`, {
        timeout: 10000
      });
      
      const files = response.data as GitHubFileInfo[];
      return files.filter(file => file.type === 'file' && file.name.endsWith('.csv'));
    } catch (error) {
      logger.error('Failed to fetch all stock files:', error);
      // Fallback to LQ45 if Semua directory is not accessible
      logger.info('Falling back to LQ45 stock files');
      return this.getLQ45StockFiles();
    }
  }

  /**
   * Download stock CSV data for a specific ticker
   */
  async downloadStockData(ticker: string, useAllStocks = false): Promise<string> {
    const directory = useAllStocks ? 'Semua' : 'LQ45';
    const fileName = `${ticker.toUpperCase()}.csv`;
    const url = `${this.rawUrl}/Saham/${directory}/${fileName}`;
    
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        responseType: 'text'
      });
      
      return response.data;
    } catch (error) {
      if (!useAllStocks) {
        // Try the comprehensive dataset if LQ45 fails
        logger.info(`${ticker} not found in LQ45, trying comprehensive dataset`);
        return this.downloadStockData(ticker, true);
      }
      
      logger.error(`Failed to download stock data for ${ticker}:`, error);
      throw new Error(`Stock data not available for ticker: ${ticker}`);
    }
  }

  /**
   * Get repository information and metadata
   */
  async getRepositoryInfo(): Promise<RepositoryInfo> {
    try {
      // Get repository metadata
      const repoResponse = await axios.get(this.baseUrl, {
        timeout: 10000
      });
      
      // Get available stock files
      const stockFiles = await this.getAllStockFiles();
      const availableStocks = stockFiles.map(file => 
        file.name.replace('.csv', '').toUpperCase()
      );

      return {
        lastUpdated: repoResponse.data.updated_at,
        totalFiles: stockFiles.length,
        availableStocks
      };
    } catch (error) {
      logger.error('Failed to get repository info:', error);
      throw new Error('Unable to fetch repository information');
    }
  }

  /**
   * Check if a specific stock ticker is available in the dataset
   */
  async isStockAvailable(ticker: string): Promise<boolean> {
    try {
      const info = await this.getRepositoryInfo();
      return info.availableStocks.includes(ticker.toUpperCase());
    } catch (error) {
      logger.error(`Failed to check availability for ${ticker}:`, error);
      return false;
    }
  }

  /**
   * Get column definitions from the repository
   */
  async getColumnDefinitions(): Promise<string> {
    try {
      const url = `${this.rawUrl}/Keterangan%20Nama%20Kolom.md`;
      const response = await axios.get(url, {
        timeout: 10000,
        responseType: 'text'
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch column definitions:', error);
      return 'Column definitions not available';
    }
  }
}