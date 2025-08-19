/**
 * Logging utilities for IDX MCP Server
 */

import winston from 'winston';
import { config } from '../config';

// Safe JSON stringify that handles circular references and errors
function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj, (_key, value) => {
      // Handle errors by converting them to simple objects
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (value.constructor?.name === 'ClientRequest' || 
            value.constructor?.name === 'IncomingMessage' ||
            value.constructor?.name === 'Socket') {
          return '[Circular Reference]';
        }
      }
      return value;
    });
  } catch (error) {
    return `[Failed to stringify: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    this.logger = this.createLogger();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogger(): winston.Logger {
    const logConfig = config.getLogging();
    
    const transports: winston.transport[] = [];
    
    // Check if in MCP mode
    const isMcpMode = process.env['IDX_MCP_LOG_LEVEL'] === 'error' || process.argv.includes('--mcp');
    
    if (!isMcpMode) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              let log = `${timestamp} [${level}]: ${message}`;
              if (Object.keys(meta).length > 0) {
                log += ` ${safeStringify(meta)}`;
              }
              return log;
            })
          )
        })
      );
    } else {
      // In MCP mode, completely suppress console logging to avoid stdout pollution
      // Only enable if log level is error and only to stderr
      const logLevel = process.env['IDX_MCP_LOG_LEVEL'] || logConfig.level;
      if (logLevel === 'error') {
        transports.push(
          new winston.transports.Console({
            stderrLevels: ['error'],
            format: winston.format.combine(
              winston.format.printf(({ level, message, ...meta }) => {
                let log = `[idx-mcp-server] [${level}] ${message}`;
                if (Object.keys(meta).length > 0) {
                  log += ` ${safeStringify(meta)}`;
                }
                return log;
              })
            )
          })
        );
      }
    }

    if (logConfig.file) {
      transports.push(
        new winston.transports.File({
          filename: logConfig.file,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        })
      );
    }

    // Use environment log level if in MCP mode, otherwise use config
    const logLevel = process.env['IDX_MCP_LOG_LEVEL'] || logConfig.level;

    return winston.createLogger({
      level: logLevel,
      transports,
      exitOnError: false
    });
  }

  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public logMcpRequest(functionName: string, params: any, responseTime: number, error?: string): void {
    const logData = {
      functionName,
      params,
      responseTime,
      success: !error,
      error
    };

    if (error) {
      this.error(`MCP Request Failed: ${functionName}`, logData);
    } else {
      this.info(`MCP Request: ${functionName}`, logData);
    }
  }

  public logPerformanceMetrics(metrics: Record<string, any>): void {
    this.info('Performance Metrics', metrics);
  }
}

export const logger = Logger.getInstance();