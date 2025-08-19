/**
 * Technical Analysis utilities for stock data
 */

import { StockDataPoint } from './csv-parser';

export interface TechnicalIndicators {
  sma?: Record<number, number[]>; // Simple Moving Averages
  ema?: Record<number, number[]>; // Exponential Moving Averages
  rsi?: number[]; // Relative Strength Index
  macd?: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollinger?: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  support?: number;
  resistance?: number;
  volatility?: number;
}

export interface StockAnalysis {
  ticker: string;
  period: string;
  dataPoints: number;
  priceAnalysis: {
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    high52Week: number;
    low52Week: number;
    averageVolume: number;
  };
  technicalIndicators: TechnicalIndicators;
  summary: {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
    recommendation: 'buy' | 'sell' | 'hold';
    confidence: number; // 0-1
  };
}

export class TechnicalAnalysis {
  /**
   * Calculate Simple Moving Average
   */
  static calculateSMA(data: StockDataPoint[], period: number): number[] {
    const sma: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1)
          .reduce((acc, point) => acc + point.close, 0);
        sma.push(sum / period);
      }
    }
    
    return sma;
  }

  /**
   * Calculate Exponential Moving Average
   */
  static calculateEMA(data: StockDataPoint[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for the first EMA value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      if (i < data.length) {
        sum += data[i].close;
        if (i < period - 1) {
          ema.push(NaN);
        } else {
          ema.push(sum / period);
        }
      }
    }
    
    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
      const todayEMA = (data[i].close - ema[i - 1]) * multiplier + ema[i - 1];
      ema.push(todayEMA);
    }
    
    return ema;
  }

  /**
   * Calculate Relative Strength Index
   */
  static calculateRSI(data: StockDataPoint[], period: number = 14): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // Calculate initial gains and losses
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate RSI
    for (let i = 0; i < gains.length; i++) {
      if (i < period - 1) {
        rsi.push(NaN);
      } else {
        const avgGain = gains.slice(i - period + 1, i + 1)
          .reduce((sum, gain) => sum + gain, 0) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1)
          .reduce((sum, loss) => sum + loss, 0) / period;
        
        if (avgLoss === 0) {
          rsi.push(100);
        } else {
          const rs = avgGain / avgLoss;
          rsi.push(100 - (100 / (1 + rs)));
        }
      }
    }
    
    // Add NaN for the first data point (no change available)
    return [NaN, ...rsi];
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  static calculateMACD(data: StockDataPoint[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    // Calculate MACD line
    const macd: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
        macd.push(NaN);
      } else {
        macd.push(fastEMA[i] - slowEMA[i]);
      }
    }
    
    // Calculate signal line (EMA of MACD)
    const signal = this.calculateEMAFromValues(macd, signalPeriod);
    
    // Calculate histogram
    const histogram: number[] = [];
    for (let i = 0; i < macd.length; i++) {
      if (isNaN(macd[i]) || isNaN(signal[i])) {
        histogram.push(NaN);
      } else {
        histogram.push(macd[i] - signal[i]);
      }
    }
    
    return { macd, signal, histogram };
  }

  /**
   * Calculate Bollinger Bands
   */
  static calculateBollingerBands(data: StockDataPoint[], period: number = 20, stdDev: number = 2) {
    const sma = this.calculateSMA(data, period);
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        middle.push(NaN);
        lower.push(NaN);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((sum, point) => 
          sum + Math.pow(point.close - mean, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        middle.push(mean);
        upper.push(mean + (standardDeviation * stdDev));
        lower.push(mean - (standardDeviation * stdDev));
      }
    }
    
    return { upper, middle, lower };
  }

  /**
   * Calculate support and resistance levels
   */
  static calculateSupportResistance(data: StockDataPoint[]): { support: number; resistance: number } {
    const recentData = data.slice(-50); // Last 50 data points
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);
    
    // Simple approach: use recent highest high and lowest low
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    
    return { support, resistance };
  }

  /**
   * Calculate volatility (annualized)
   */
  static calculateVolatility(data: StockDataPoint[], period: number = 30): number {
    if (data.length < 2) return 0;
    
    const recentData = data.slice(-period);
    const returns: number[] = [];
    
    // Calculate daily returns
    for (let i = 1; i < recentData.length; i++) {
      const returnRate = (recentData[i].close - recentData[i - 1].close) / recentData[i - 1].close;
      returns.push(returnRate);
    }
    
    if (returns.length === 0) return 0;
    
    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    
    // Annualize (assuming 252 trading days per year)
    return dailyVolatility * Math.sqrt(252);
  }

  /**
   * Perform comprehensive stock analysis
   */
  static analyzeStock(data: StockDataPoint[], ticker: string, period: string): StockAnalysis {
    if (data.length < 2) {
      throw new Error('Insufficient data for analysis');
    }

    const currentPoint = data[data.length - 1];
    const previousPoint = data[data.length - 2];
    
    // Price analysis
    const priceChange = currentPoint.close - previousPoint.close;
    const priceChangePercent = (priceChange / previousPoint.close) * 100;
    
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume).filter(v => v > 0);
    
    const high52Week = Math.max(...highs);
    const low52Week = Math.min(...lows);
    const averageVolume = volumes.length > 0 ? 
      volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length : 0;

    // Technical indicators
    const sma = {
      20: this.calculateSMA(data, 20),
      50: this.calculateSMA(data, 50),
      200: this.calculateSMA(data, 200)
    };
    
    const ema = {
      12: this.calculateEMA(data, 12),
      26: this.calculateEMA(data, 26)
    };
    
    const rsi = this.calculateRSI(data);
    const macd = this.calculateMACD(data);
    const bollinger = this.calculateBollingerBands(data);
    const { support, resistance } = this.calculateSupportResistance(data);
    const volatility = this.calculateVolatility(data);

    // Generate summary
    const summary = this.generateSummary(data, { sma, ema, rsi, macd, bollinger });

    return {
      ticker,
      period,
      dataPoints: data.length,
      priceAnalysis: {
        currentPrice: currentPoint.close,
        priceChange,
        priceChangePercent,
        high52Week,
        low52Week,
        averageVolume
      },
      technicalIndicators: {
        sma,
        ema,
        rsi,
        macd,
        bollinger,
        support,
        resistance,
        volatility
      },
      summary
    };
  }

  /**
   * Generate trading summary and recommendation
   */
  private static generateSummary(data: StockDataPoint[], indicators: any): StockAnalysis['summary'] {
    const currentPrice = data[data.length - 1].close;
    const signals: Array<{ signal: 'bullish' | 'bearish' | 'neutral'; weight: number }> = [];

    // SMA trend analysis
    const sma20 = indicators.sma[20];
    const sma50 = indicators.sma[50];
    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];

    if (!isNaN(currentSMA20) && !isNaN(currentSMA50)) {
      if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50) {
        signals.push({ signal: 'bullish', weight: 0.3 });
      } else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50) {
        signals.push({ signal: 'bearish', weight: 0.3 });
      } else {
        signals.push({ signal: 'neutral', weight: 0.1 });
      }
    }

    // RSI analysis
    const rsi = indicators.rsi;
    const currentRSI = rsi[rsi.length - 1];
    if (!isNaN(currentRSI)) {
      if (currentRSI > 70) {
        signals.push({ signal: 'bearish', weight: 0.25 }); // Overbought
      } else if (currentRSI < 30) {
        signals.push({ signal: 'bullish', weight: 0.25 }); // Oversold
      } else {
        signals.push({ signal: 'neutral', weight: 0.1 });
      }
    }

    // MACD analysis
    const macd = indicators.macd;
    const currentMACD = macd.macd[macd.macd.length - 1];
    const currentSignal = macd.signal[macd.signal.length - 1];
    if (!isNaN(currentMACD) && !isNaN(currentSignal)) {
      if (currentMACD > currentSignal) {
        signals.push({ signal: 'bullish', weight: 0.2 });
      } else {
        signals.push({ signal: 'bearish', weight: 0.2 });
      }
    }

    // Calculate overall sentiment
    let bullishScore = 0;
    let bearishScore = 0;
    let totalWeight = 0;

    signals.forEach(({ signal, weight }) => {
      totalWeight += weight;
      if (signal === 'bullish') bullishScore += weight;
      else if (signal === 'bearish') bearishScore += weight;
    });

    const bullishPercent = bullishScore / totalWeight;
    const bearishPercent = bearishScore / totalWeight;

    let trend: 'bullish' | 'bearish' | 'neutral';
    let strength: 'strong' | 'moderate' | 'weak';
    let recommendation: 'buy' | 'sell' | 'hold';
    let confidence: number;

    if (bullishPercent > 0.6) {
      trend = 'bullish';
      strength = bullishPercent > 0.8 ? 'strong' : 'moderate';
      recommendation = 'buy';
      confidence = bullishPercent;
    } else if (bearishPercent > 0.6) {
      trend = 'bearish';
      strength = bearishPercent > 0.8 ? 'strong' : 'moderate';
      recommendation = 'sell';
      confidence = bearishPercent;
    } else {
      trend = 'neutral';
      strength = 'weak';
      recommendation = 'hold';
      confidence = 0.5;
    }

    return { trend, strength, recommendation, confidence };
  }

  /**
   * Helper function to calculate EMA from array of values
   */
  private static calculateEMAFromValues(values: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Find first non-NaN value for starting point
    let startIndex = values.findIndex(val => !isNaN(val));
    if (startIndex === -1) return values.map(() => NaN);
    
    // Fill initial NaN values
    for (let i = 0; i < startIndex + period - 1; i++) {
      ema.push(NaN);
    }
    
    // Calculate initial SMA
    if (startIndex + period - 1 < values.length) {
      const validValues = values.slice(startIndex, startIndex + period)
        .filter(val => !isNaN(val));
      const initialSMA = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
      ema.push(initialSMA);
      
      // Calculate EMA for remaining values
      for (let i = startIndex + period; i < values.length; i++) {
        if (!isNaN(values[i])) {
          const todayEMA = (values[i] - ema[i - 1]) * multiplier + ema[i - 1];
          ema.push(todayEMA);
        } else {
          ema.push(ema[i - 1]); // Carry forward previous EMA if current value is NaN
        }
      }
    }
    
    return ema;
  }
}