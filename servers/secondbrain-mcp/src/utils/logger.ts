import { config } from './config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  sessionId?: string;
  correlationId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private structured: boolean;

  constructor() {
    this.logLevel = config.logLevel;
    this.structured = config.enableStructuredLogging;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();

    if (this.structured) {
      const entry: LogEntry = {
        timestamp,
        level,
        message,
        ...(context && { context })
      };
      return JSON.stringify(entry);
    } else {
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  // Helper method for creating session-scoped loggers
  withSession(sessionId: string) {
    return {
      debug: (message: string, context?: Record<string, any>) =>
        this.debug(message, { ...context, sessionId }),
      info: (message: string, context?: Record<string, any>) =>
        this.info(message, { ...context, sessionId }),
      warn: (message: string, context?: Record<string, any>) =>
        this.warn(message, { ...context, sessionId }),
      error: (message: string, context?: Record<string, any>) =>
        this.error(message, { ...context, sessionId })
    };
  }

  // Helper method for creating correlation-scoped loggers
  withCorrelation(correlationId: string) {
    return {
      debug: (message: string, context?: Record<string, any>) =>
        this.debug(message, { ...context, correlationId }),
      info: (message: string, context?: Record<string, any>) =>
        this.info(message, { ...context, correlationId }),
      warn: (message: string, context?: Record<string, any>) =>
        this.warn(message, { ...context, correlationId }),
      error: (message: string, context?: Record<string, any>) =>
        this.error(message, { ...context, correlationId })
    };
  }
}

export const logger = new Logger();
