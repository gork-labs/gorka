import { config } from './config.js';
class Logger {
    constructor() {
        this.logLevel = config.logLevel;
        this.structured = config.enableStructuredLogging;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }
    formatMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        if (this.structured) {
            const entry = {
                timestamp,
                level,
                message,
                ...(context && { context })
            };
            return JSON.stringify(entry);
        }
        else {
            const contextStr = context ? ` ${JSON.stringify(context)}` : '';
            return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
        }
    }
    debug(message, context) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, context));
        }
    }
    info(message, context) {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, context));
        }
    }
    warn(message, context) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, context));
        }
    }
    error(message, context) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, context));
        }
    }
    // Helper method for creating session-scoped loggers
    withSession(sessionId) {
        return {
            debug: (message, context) => this.debug(message, { ...context, sessionId }),
            info: (message, context) => this.info(message, { ...context, sessionId }),
            warn: (message, context) => this.warn(message, { ...context, sessionId }),
            error: (message, context) => this.error(message, { ...context, sessionId })
        };
    }
    // Helper method for creating correlation-scoped loggers
    withCorrelation(correlationId) {
        return {
            debug: (message, context) => this.debug(message, { ...context, correlationId }),
            info: (message, context) => this.info(message, { ...context, correlationId }),
            warn: (message, context) => this.warn(message, { ...context, correlationId }),
            error: (message, context) => this.error(message, { ...context, correlationId })
        };
    }
}
export const logger = new Logger();
