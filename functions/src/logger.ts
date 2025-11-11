/**
 * UTILITX Firebase Functions Logger
 * 
 * Enhanced logger for Firebase Functions that uses structured logging.
 * This file can safely import firebase-functions since it's only used in the functions directory.
 * 
 * Usage in Firebase Functions:
 *   import { logger } from './logger';
 *   
 *   logger.supabase('upload', { file: 'example.pdf' });
 *   logger.esri('query', { layer: 'WorkAreas' });
 */

import * as functions from 'firebase-functions';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class FirebaseFunctionsLogger {
  private firebaseLogger = functions.logger;

  /**
   * Log Supabase operations with structured logging
   */
  supabase(operation: string, context?: LogContext, level: LogLevel = 'info') {
    this.log('SUPABASE', operation, context, level);
  }

  /**
   * Log Esri API operations with structured logging
   */
  esri(operation: string, context?: LogContext, level: LogLevel = 'info') {
    this.log('ESRI', operation, context, level);
  }

  /**
   * Log GPT/OpenAI API operations with structured logging
   */
  gpt(operation: string, context?: LogContext, level: LogLevel = 'info') {
    this.log('GPT', operation, context, level);
  }

  /**
   * Log Flask backend API operations with structured logging
   */
  flask(operation: string, context?: LogContext, level: LogLevel = 'info') {
    this.log('FLASK', operation, context, level);
  }

  /**
   * Generic log method using Firebase Functions structured logging
   */
  private log(service: string, operation: string, context?: LogContext, level: LogLevel = 'info') {
    const logEntry = {
      service,
      operation,
      timestamp: new Date().toISOString(),
      ...context,
    };

    const message = `${service} ${operation}`;

    switch (level) {
      case 'error':
        this.firebaseLogger.error(message, logEntry);
        break;
      case 'warn':
        this.firebaseLogger.warn(message, logEntry);
        break;
      case 'debug':
        this.firebaseLogger.debug(message, logEntry);
        break;
      default:
        this.firebaseLogger.info(message, logEntry);
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
export const logger = new FirebaseFunctionsLogger();

// Export class for testing
export { FirebaseFunctionsLogger };

