/**
 * Configurable logging system for idyll-engine
 * 
 * This replaces console.log calls with a proper logger that can be
 * configured or disabled for production use.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  includeTimestamp: boolean;
  prefix?: string;
}

export class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.WARN, // Default to WARN for production
      enableColors: true,
      includeTimestamp: false,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const prefix = this.config.prefix ? `[${this.config.prefix}] ` : '';
    const timestamp = this.config.includeTimestamp ? `${new Date().toISOString()} ` : '';
    
    let levelStr = '';
    if (this.config.enableColors) {
      switch (level) {
        case LogLevel.DEBUG:
          levelStr = '\x1b[36mDEBUG\x1b[0m'; // Cyan
          break;
        case LogLevel.INFO:
          levelStr = '\x1b[34mINFO\x1b[0m'; // Blue
          break;
        case LogLevel.WARN:
          levelStr = '\x1b[33mWARN\x1b[0m'; // Yellow
          break;
        case LogLevel.ERROR:
          levelStr = '\x1b[31mERROR\x1b[0m'; // Red
          break;
      }
    } else {
      levelStr = LogLevel[level];
    }

    return `${timestamp}${prefix}${levelStr}: ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message), ...args);
    }
  }

  // Convenience methods for common patterns
  execution(message: string, ...args: any[]): void {
    this.debug(`🔧 ${message}`, ...args);
  }

  agent(message: string, ...args: any[]): void {
    this.debug(`[Agent] ${message}`, ...args);
  }

  function(message: string, ...args: any[]): void {
    this.debug(`🎯 ${message}`, ...args);
  }

  // Update configuration
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Global logger instance
export const logger = new Logger();

// Development helper - can be removed in production builds
export const createLogger = (prefix: string, level: LogLevel = LogLevel.WARN): Logger => {
  return new Logger({ prefix, level });
};