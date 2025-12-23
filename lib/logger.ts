/**
 * UTILITX Logger Utility (Frontend-Safe)
 * 
 * Provides structured logging for Supabase, Esri, GPT, and Flask API calls.
 * Works in both client-side and server-side environments.
 * 
 * IMPORTANT: This is a frontend-safe logger with NO firebase-functions dependency.
 * For Firebase Functions structured logging, see functions/src/logger.ts
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   
 *   logger.supabase('upload', { file: 'example.pdf', bucket: 'Records_Private' });
 *   logger.esri('query', { layer: 'WorkAreas', features: 10 });
 *   logger.gpt('completion', { tokens: 150, model: 'gpt-4' });
 *   logger.flask('api_call', { endpoint: '/process', duration: 250 });
 * 
 * Note: In Firebase Functions, console.log is automatically captured and structured.
 * This logger formats logs consistently for easy filtering in Firebase Console.
 */

import { appVersion, environment, commit } from './app-metadata';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

const metadata = {
  environment,
  appVersion,
  commit,
};

class UTILITXLogger {
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
   * Uses console logging which works everywhere and is automatically structured in Firebase Functions
   */
  private log(service: string, operation: string, context?: LogContext, level: LogLevel = 'info') {
    const logEntry = {
      service: service.toUpperCase(),
      operation,
      timestamp: new Date().toISOString(),
      ...metadata,
      ...context,
    };

    // Format: [UTILITX] [SERVICE] operation
    // This format makes it easy to filter logs in Firebase Console
    const prefix = `[UTILITX] [${service.toUpperCase()}] ${operation}`;

    switch (level) {
      case 'error':
        console.error(prefix, logEntry);
        break;
      case 'warn':
        console.warn(prefix, logEntry);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(prefix, logEntry);
        }
        break;
      default:
        console.info(prefix, logEntry);
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

