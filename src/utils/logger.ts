import { config } from '../config/index.js';

export class Logger {
  private static instance: Logger;
  private enableDetailedLogs: boolean;

  private constructor() {
    this.enableDetailedLogs = config.logging.enableDetailedLogs;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, traceId: string, message: string, emoji?: string): string {
    const timestamp = new Date().toISOString();
    const emojiPrefix = emoji ? `${emoji} ` : '';
    return `[${timestamp}] [${level}] [${traceId}] ${emojiPrefix}${message}`;
  }

  // High-level status logging - always shows (overview mode)
  status(traceId: string, message: string, emoji?: string): void {
    console.log(this.formatMessage('STATUS', traceId, message, emoji));
  }

  // Detailed logging - only shows when ENABLE_DETAILED_LOGS=true
  detailed(traceId: string, message: string, emoji?: string): void {
    if (this.enableDetailedLogs) {
      console.log(this.formatMessage('DETAILED', traceId, message, emoji));
    }
  }

  // Error logging - always shows
  error(traceId: string, message: string, error?: any, emoji?: string): void {
    const errorMsg = error ? ` - ${error instanceof Error ? error.message : String(error)}` : '';
    console.error(this.formatMessage('ERROR', traceId, message + errorMsg, emoji || '❌'));
  }

  // Warning logging - always shows
  warn(traceId: string, message: string, emoji?: string): void {
    console.warn(this.formatMessage('WARN', traceId, message, emoji || '⚠️'));
  }

  // Check if detailed logging is enabled
  isDetailedLoggingEnabled(): boolean {
    return this.enableDetailedLogs;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();