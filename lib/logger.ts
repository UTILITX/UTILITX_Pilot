/**
 * UTILITX Logger Utility
 * 
 * Provides structured logging for Supabase, Esri, GPT, and Flask API calls.
 * Works in both client-side and server-side (Firebase Functions) environments.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   
 *   logger.supabase('upload', { file: 'example.pdf', bucket: 'Records_Private' });
 *   logger.esri('query', { layer: 'WorkAreas', features: 10 });
 *   logger.gpt('completion', { tokens: 150, model: 'gpt-4' });
 *   logger.flask('api_call', { endpoint: '/process', duration: 250 });
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class UTILITXLogger {
  private isServer = typeof window === 'undefined';
  private isFirebaseFunctions = this.isServer && typeof process !== 'undefined' && !!process.env.FUNCTION_TARGET;

  /**
   * Log Supabase operations
   */
  supabase(operation: string, context?: LogContext, level: LogLevel = 'info') {
    this.log('supabase', operation, context, level);
  }

  /**
   * Log Esri API operations
   */
  esri(operation: string, context?: LogContext, level: LogLevel = 'info') {
    this.log('esri', operation, context, level);
  }

  /**
   * Log GPT/OpenAI API operations
   */
  gpt(operation: string, context?: LogContext, level: LogLevel = 'info') {
    this.log('gpt', operation, context, level);
  }

  /**
   * Log Flask backend API operations
   */
  flask(operation: string, context?: LogContext, level: LogLevel = 'info') {
    this.log('flask', operation, context, level);
  }

  /**
   * Generic log method
   */
  private log(service: string, operation: string, context?: LogContext, level: LogLevel = 'info') {
    const logEntry = {
      service,
      operation,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Firebase Functions: Use structured logging
    // Note: Next.js will show a warning about firebase-functions during build
    // This is harmless - the require is wrapped in try-catch and only runs in Functions runtime
    if (this.isFirebaseFunctions) {
      try {
        // Use eval to prevent Next.js from trying to resolve firebase-functions at build time
        // This is safe because we're in a try-catch and only runs server-side in Functions
        const requireFunc = typeof require !== 'undefined' ? require : (() => { throw new Error('require not available'); });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const functions = requireFunc('firebase-functions');
        if (functions && functions.logger) {
          const logger = functions.logger;
          switch (level) {
            case 'error':
              logger.error(`${service.toUpperCase()} ${operation}`, logEntry);
              break;
            case 'warn':
              logger.warn(`${service.toUpperCase()} ${operation}`, logEntry);
              break;
            case 'debug':
              logger.debug(`${service.toUpperCase()} ${operation}`, logEntry);
              break;
            default:
              logger.info(`${service.toUpperCase()} ${operation}`, logEntry);
          }
          return;
        }
      } catch (e) {
        // firebase-functions not available (expected during Next.js build)
        // Fall through to console logging
      }
    }

    // Client-side or server-side (non-Firebase): Use console
    const prefix = `[${service.toUpperCase()}] ${operation}`;
    const message = context ? `${prefix}:` : prefix;

    switch (level) {
      case 'error':
        console.error(message, logEntry);
        break;
      case 'warn':
        console.warn(message, logEntry);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(message, logEntry);
        }
        break;
      default:
        console.log(message, logEntry);
    }
  }

  /**
   * Log errors with stack traces
   */
  error(service: string, operation: string, error: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error.message,
      stack: error.stack,
    };

    this.log(service, operation, errorContext, 'error');
  }

  /**
   * Log performance metrics
   */
  performance(service: string, operation: string, duration: number, context?: LogContext) {
    this.log(service, operation, {
      ...context,
      duration: `${duration}ms`,
      performance: true,
    }, 'info');
  }
}

// Export singleton instance
export const logger = new UTILITXLogger();

// Export class for testing
export { UTILITXLogger };

