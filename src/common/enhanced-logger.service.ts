import { Injectable, Logger as NestLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Log Entry Interface for Structured Logging
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  traceId?: string;
  correlationId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Performance Metrics Interface
 */
export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorType?: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced Logger Service with Structured Logging and Metrics
 */
@Injectable()
export class EnhancedLoggerService {
  private readonly nestLogger = new NestLogger(EnhancedLoggerService.name);
  private readonly isStructuredLoggingEnabled: boolean;
  private readonly metricsEnabled: boolean;
  private readonly tracingEnabled: boolean;
  private readonly performanceMetrics: PerformanceMetrics[] = [];

  constructor(private configService: ConfigService) {
    this.isStructuredLoggingEnabled = this.configService.get<boolean>('logging.enableStructuredLogging', true);
    this.metricsEnabled = this.configService.get<boolean>('logging.enableMetrics', false);
    this.tracingEnabled = this.configService.get<boolean>('logging.enableTracing', false);
  }

  /**
   * Log with structured format
   */
  log(message: string, context?: string, metadata?: Record<string, any>): void {
    this.writeLog('info', message, context, metadata);
  }

  /**
   * Log error with structured format
   */
  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    const errorMetadata = error ? {
      ...metadata,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : metadata;

    this.writeLog('error', message, context, errorMetadata);
  }

  /**
   * Log warning with structured format
   */
  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.writeLog('warn', message, context, metadata);
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.writeLog('debug', message, context, metadata);
  }

  /**
   * Log verbose information
   */
  verbose(message: string, context?: string, metadata?: Record<string, any>): void {
    this.writeLog('verbose', message, context, metadata);
  }

  /**
   * Log operation start and return performance tracker
   */
  startOperation(operationName: string, metadata?: Record<string, any>): PerformanceTracker {
    const startTime = Date.now();
    const trackerId = this.generateTrackerId();
    
    if (this.tracingEnabled) {
      this.log(`🚀 Starting operation: ${operationName}`, 'PerformanceTracker', {
        ...metadata,
        trackerId,
        startTime
      });
    }

    return new PerformanceTracker(
      operationName,
      startTime,
      trackerId,
      this,
      metadata
    );
  }

  /**
   * Complete performance tracking
   */
  completeOperation(tracker: PerformanceTracker, success: boolean, errorType?: string): void {
    const endTime = Date.now();
    const duration = endTime - tracker.startTime;

    const metrics: PerformanceMetrics = {
      operationName: tracker.operationName,
      startTime: tracker.startTime,
      endTime,
      duration,
      success,
      errorType,
      metadata: tracker.metadata
    };

    if (this.metricsEnabled) {
      this.performanceMetrics.push(metrics);
    }

    if (this.tracingEnabled) {
      const statusIcon = success ? '✅' : '❌';
      
      if (success) {
        this.log(`${statusIcon} Completed operation: ${tracker.operationName}`, 'PerformanceTracker', {
          trackerId: tracker.trackerId,
          duration,
          success,
          errorType,
          ...tracker.metadata
        });
      } else {
        this.error(`${statusIcon} Completed operation: ${tracker.operationName}`, undefined, 'PerformanceTracker', {
          trackerId: tracker.trackerId,
          duration,
          success,
          errorType,
          ...tracker.metadata
        });
      }
    }
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(operationName?: string): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    p95Duration: number;
    errorBreakdown: Record<string, number>;
  } {
    const filteredMetrics = operationName 
      ? this.performanceMetrics.filter(m => m.operationName === operationName)
      : this.performanceMetrics;

    if (filteredMetrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        p95Duration: 0,
        errorBreakdown: {}
      };
    }

    const successfulOps = filteredMetrics.filter(m => m.success);
    const durations = filteredMetrics.map(m => m.duration || 0).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);

    const errorBreakdown = filteredMetrics
      .filter(m => !m.success)
      .reduce((acc, m) => {
        const errorType = m.errorType || 'Unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalOperations: filteredMetrics.length,
      successRate: successfulOps.length / filteredMetrics.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95Duration: durations[p95Index] || 0,
      errorBreakdown
    };
  }

  /**
   * Clear metrics (useful for testing or periodic cleanup)
   */
  clearMetrics(): void {
    this.performanceMetrics.length = 0;
  }

  /**
   * Write log entry
   */
  private writeLog(level: string, message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.isStructuredLoggingEnabled) {
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message,
        context,
        metadata,
        traceId: this.generateTraceId(),
        correlationId: this.getCorrelationId()
      };

      // Output as JSON for log aggregation systems
      console.log(JSON.stringify(logEntry));
    } else {
      // Fall back to standard NestJS logging
      const contextName = context || 'Application';
      const logMessage = metadata ? `${message} ${JSON.stringify(metadata)}` : message;
      
      switch (level) {
        case 'error':
          this.nestLogger.error(logMessage, contextName);
          break;
        case 'warn':
          this.nestLogger.warn(logMessage, contextName);
          break;
        case 'debug':
          this.nestLogger.debug(logMessage, contextName);
          break;
        case 'verbose':
          this.nestLogger.verbose(logMessage, contextName);
          break;
        default:
          this.nestLogger.log(logMessage, contextName);
      }
    }
  }

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate unique tracker ID
   */
  private generateTrackerId(): string {
    return `tracker_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get correlation ID from request context (implementation would depend on your tracing setup)
   */
  private getCorrelationId(): string | undefined {
    // In a real application, this would extract correlation ID from async context
    // For now, return undefined
    return undefined;
  }
}

/**
 * Performance Tracker Class
 */
export class PerformanceTracker {
  constructor(
    public readonly operationName: string,
    public readonly startTime: number,
    public readonly trackerId: string,
    private logger: EnhancedLoggerService,
    public readonly metadata?: Record<string, any>
  ) {}

  /**
   * Mark operation as successful and complete tracking
   */
  success(metadata?: Record<string, any>): void {
    const finalMetadata = { ...this.metadata, ...metadata };
    this.logger.completeOperation(
      { ...this, metadata: finalMetadata }, 
      true
    );
  }

  /**
   * Mark operation as failed and complete tracking
   */
  failure(error: Error, metadata?: Record<string, any>): void {
    const finalMetadata = { ...this.metadata, ...metadata };
    this.logger.completeOperation(
      { ...this, metadata: finalMetadata }, 
      false, 
      error.name
    );
  }

  /**
   * Add metadata to the tracker
   */
  addMetadata(metadata: Record<string, any>): void {
    Object.assign(this.metadata || {}, metadata);
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}