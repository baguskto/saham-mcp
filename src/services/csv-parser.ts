/**
 * CSV parser for Indonesian stock market data
 */

import { logger } from '../utils/logger';

export interface StockDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface ParsedStockData {
  ticker: string;
  dataPoints: StockDataPoint[];
  startDate: Date;
  endDate: Date;
  totalPoints: number;
  columns: string[];
}

export class CSVParser {
  /**
   * Parse CSV stock data from Dataset-Saham-IDX format
   */
  static parseStockCSV(csvData: string, ticker: string): ParsedStockData {
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('Invalid CSV data: insufficient rows');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    logger.debug(`CSV headers for ${ticker}:`, headers);

    // Map common column variations to standard names
    const columnMap = this.createColumnMap(headers);
    
    const dataPoints: StockDataPoint[] = [];
    
    // Parse data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        logger.warn(`Skipping malformed row ${i} in ${ticker} data`);
        continue;
      }

      try {
        const dataPoint = this.parseDataRow(values, columnMap);
        if (dataPoint) {
          dataPoints.push(dataPoint);
        }
      } catch (error) {
        logger.warn(`Failed to parse row ${i} in ${ticker}:`, error);
      }
    }

    if (dataPoints.length === 0) {
      throw new Error('No valid data points found in CSV');
    }

    // Sort by date (oldest first)
    dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      ticker: ticker.toUpperCase(),
      dataPoints,
      startDate: dataPoints[0].date,
      endDate: dataPoints[dataPoints.length - 1].date,
      totalPoints: dataPoints.length,
      columns: headers
    };
  }

  /**
   * Create column mapping for different CSV formats
   */
  private static createColumnMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Date column variations (prefer exact matches first)
      if (normalized === 'date' || normalized === 'tanggal' || 
          normalized === 'time' || normalized === 'timestamp') {
        map.date = index;
      }
      // Open price variations (prefer exact matches)
      if (normalized === 'open' || normalized === 'openprice' || normalized === 'buka') {
        map.open = index;
      }
      // High price variations (prefer exact matches)  
      if (normalized === 'high' || normalized === 'tinggi' || normalized === 'max') {
        map.high = index;
      }
      // Low price variations (prefer exact matches)
      if (normalized === 'low' || normalized === 'rendah' || normalized === 'min') {
        map.low = index;
      }
      // Close price variations (prefer exact matches)
      if (normalized === 'close' || normalized === 'closeprice' || normalized === 'tutup' || 
               normalized === 'akhir') {
        map.close = index;
      }
      // Volume variations (prefer exact "volume" match, avoid non-regular volumes)
      if (normalized === 'volume' || normalized === 'vol') {
        map.volume = index;
      }
      // Adjusted close variations
      if (normalized.includes('adj') || normalized.includes('adjusted')) {
        map.adjustedClose = index;
      }
    });
    
    // Secondary date patterns (only if not already mapped)
    if (map.date === undefined) {
      headers.forEach((header, index) => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.includes('date') || normalized.includes('tanggal') || 
            normalized.includes('time')) {
          map.date = index;
          return; // Exit early once found
        }
      });
    }

    // Fallback patterns for open/high/low/close if exact matches not found
    if (map.open === undefined) {
      headers.forEach((header, index) => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.includes('open') || normalized.includes('buka')) {
          map.open = index;
        }
      });
    }
    
    if (map.high === undefined) {
      headers.forEach((header, index) => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.includes('high') || normalized.includes('tinggi')) {
          map.high = index;
        }
      });
    }
    
    if (map.low === undefined) {
      headers.forEach((header, index) => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.includes('low') || normalized.includes('rendah')) {
          map.low = index;
        }
      });
    }
    
    if (map.close === undefined) {
      headers.forEach((header, index) => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.includes('close') || normalized.includes('tutup')) {
          map.close = index;
        }
      });
    }

    return map;
  }

  /**
   * Parse individual data row
   */
  private static parseDataRow(values: string[], columnMap: Record<string, number>): StockDataPoint | null {
    try {
      // Date is required
      if (columnMap.date === undefined) {
        throw new Error('Date column not found');
      }

      const dateStr = values[columnMap.date];
      const date = this.parseDate(dateStr);

      // OHLC values are required
      const open = this.parseNumber(values[columnMap.open]);
      const high = this.parseNumber(values[columnMap.high]);
      const low = this.parseNumber(values[columnMap.low]);
      const close = this.parseNumber(values[columnMap.close]);

      // Check for null values in required fields
      if (open === null || high === null || low === null || close === null) {
        throw new Error('Missing required OHLC values');
      }

      // Volume is optional but preferred
      const volume = columnMap.volume !== undefined ? 
        this.parseNumber(values[columnMap.volume]) || 0 : 0;

      // Adjusted close is optional
      const adjustedClose = columnMap.adjustedClose !== undefined ? 
        this.parseNumber(values[columnMap.adjustedClose]) || undefined : undefined;

      // Validate OHLC values
      if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        throw new Error('Invalid OHLC values');
      }

      if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) {
        throw new Error('Inconsistent OHLC values');
      }

      return {
        date,
        open,
        high,
        low,
        close,
        volume,
        adjustedClose
      };
    } catch (error) {
      logger.debug('Failed to parse data row:', error);
      return null;
    }
  }

  /**
   * Parse date string in various formats
   */
  private static parseDate(dateStr: string): Date {
    // Remove any surrounding quotes or whitespace
    const cleaned = dateStr.replace(/["']/g, '').trim();
    
    // Try different date formats common in Indonesian datasets
    const formats = [
      // ISO format: 2023-01-15
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // DD/MM/YYYY or MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      // YYYY/MM/DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/
    ];

    // Try ISO format first
    const isoMatch = cleaned.match(formats[0]);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try other formats
    for (let i = 1; i < formats.length; i++) {
      const match = cleaned.match(formats[i]);
      if (match) {
        const [, part1, part2, part3] = match;
        
        if (i === 3) { // YYYY/MM/DD
          return new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
        } else { // DD/MM/YYYY or DD-MM-YYYY (assume DD/MM/YYYY for Indonesian data)
          return new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
        }
      }
    }

    // Fallback to JavaScript Date parsing
    const fallbackDate = new Date(cleaned);
    if (isNaN(fallbackDate.getTime())) {
      throw new Error(`Unable to parse date: ${dateStr}`);
    }

    return fallbackDate;
  }

  /**
   * Parse number string, handling various formats
   */
  private static parseNumber(numStr: string): number | null {
    if (!numStr || numStr.trim() === '') {
      return null;
    }

    // Clean the string: remove quotes, commas, and non-numeric characters except decimal point
    const cleaned = numStr
      .replace(/["']/g, '')
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '')
      .trim();

    if (cleaned === '' || cleaned === '-') {
      return null;
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Filter data points by date range
   */
  static filterByDateRange(
    data: ParsedStockData, 
    startDate?: Date, 
    endDate?: Date
  ): StockDataPoint[] {
    let filtered = data.dataPoints;

    if (startDate) {
      filtered = filtered.filter(point => point.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(point => point.date <= endDate);
    }

    return filtered;
  }

  /**
   * Get data for specific period (last N days, months, etc.)
   */
  static getDataForPeriod(data: ParsedStockData, period: string): StockDataPoint[] {
    const now = new Date();
    let startDate: Date;

    switch (period.toLowerCase()) {
      case '1d':
      case '1day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1w':
      case '1week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
      case '1month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3m':
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6m':
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1y':
      case '1year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case '2y':
      case '2years':
        startDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
        break;
      case '5y':
      case '5years':
        startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        break;
      default:
        // Return all data for unknown periods
        return data.dataPoints;
    }

    return this.filterByDateRange(data, startDate);
  }
}