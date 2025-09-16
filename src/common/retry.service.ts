import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Retry Configuration Interface
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

/**
 * Retry Attempt Information
 */
export interface RetryAttempt {
  attempt: number;
  maxRetries: number;
  error: Error;
  nextDelayMs: number;
  totalElapsedMs: number;
}

/**
 * Retry Result
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalElapsedMs: number;
}

/**
 * Retry Condition Function
 */
export type RetryCondition = (error: Error, attempt: number) => boolean;

/**
 * Default retry conditions for different error types
 */
export class RetryConditions {
  /**
   * Retry on network-related errors
   */
  static networkErrors: RetryCondition = (error: Error) => {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETDOWN',
      'ENETUNREACH',
      'EHOSTDOWN',
      'EHOSTUNREACH',
      'EPIPE'
    ];
    
    return retryableErrors.some(code => 
      error.message.includes(code) || 
      (error as any).code === code
    );
  };

  /**
   * Retry on HTTP 5xx server errors and specific 4xx errors
   */
  static httpErrors: RetryCondition = (error: Error) => {
    const statusCode = (error as any).status || (error as any).statusCode;
    if (!statusCode) return false;
    
    // Retry on 5xx server errors
    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }
    
    // Retry on specific 4xx errors
    const retryable4xx = [408, 429]; // Request Timeout, Too Many Requests
    return retryable4xx.includes(statusCode);
  };

  /**
   * Retry on AWS/Bedrock specific errors
   */
  static bedrockErrors: RetryCondition = (error: Error) => {
    const retryableBedrockErrors = [
      'ThrottlingException',
      'ServiceUnavailableException',
      'InternalServerException',
      'ModelTimeoutException',
      'ModelNotReadyException'
    ];
    
    return retryableBedrockErrors.some(errorType => 
      error.message.includes(errorType) ||
      (error as any).name === errorType
    );
  };

  /**
   * Combine multiple retry conditions with OR logic
   */
  static combine(...conditions: RetryCondition[]): RetryCondition {
    return (error: Error, attempt: number) => 
      conditions.some(condition => condition(error, attempt));
  }

  /**
   * Default retry condition that combines common scenarios
   */
  static default: RetryCondition = RetryConditions.combine(
    RetryConditions.networkErrors,
    RetryConditions.httpErrors,
    RetryConditions.bedrockErrors
  );
}

/**
 * Enhanced Retry Service with Exponential Backoff and Jitter
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly defaultConfig: RetryConfig;

  constructor(private configService: ConfigService) {
    this.defaultConfig = {
      maxRetries: this.configService.get<number>('app.globalMaxRetries', 3),
      baseDelayMs: this.configService.get<number>('app.retryDelayMs', 1000),
      maxDelayMs: 30000, // 30 seconds max delay
      backoffMultiplier: this.configService.get<number>('app.retryBackoffMultiplier', 2),
      jitterEnabled: true
    };
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCondition: RetryCondition = RetryConditions.default,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    let lastError: Error;
    
    for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          operation,
          this.configService.get<number>('app.globalTimeoutMs', 30000)
        );
        
        const totalElapsedMs = Date.now() - startTime;
        
        if (attempt > 1) {
          this.logger.log(`✅ Operation succeeded after ${attempt} attempts in ${totalElapsedMs}ms`);
        }
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalElapsedMs
        };
      } catch (error) {
        lastError = error as Error;
        const totalElapsedMs = Date.now() - startTime;
        
        // Check if we should retry
        if (attempt <= finalConfig.maxRetries && retryCondition(lastError, attempt)) {
          const delayMs = this.calculateDelay(attempt, finalConfig);
          
          this.logger.warn(
            `🔄 Attempt ${attempt}/${finalConfig.maxRetries + 1} failed: ${lastError.message}. ` +
            `Retrying in ${delayMs}ms...`
          );
          
          await this.delay(delayMs);
        } else {
          this.logger.error(
            `❌ Operation failed after ${attempt} attempts in ${totalElapsedMs}ms: ${lastError.message}`
          );
          break;
        }
      }
    }
    
    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxRetries + 1,
      totalElapsedMs: Date.now() - startTime
    };
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    if (config.jitterEnabled) {
      const jitterRange = cappedDelay * 0.1; // ±10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, cappedDelay + jitter);
    }
    
    return cappedDelay;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry configuration for specific use cases
   */
  createRetryConfig(overrides: Partial<RetryConfig>): RetryConfig {
    return { ...this.defaultConfig, ...overrides };
  }

  /**
   * Get retry statistics for monitoring
   */
  getRetryStats(results: RetryResult<any>[]): {
    totalOperations: number;
    successRate: number;
    averageAttempts: number;
    averageLatency: number;
  } {
    const totalOperations = results.length;
    const successfulOperations = results.filter(r => r.success).length;
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);
    const totalLatency = results.reduce((sum, r) => sum + r.totalElapsedMs, 0);
    
    return {
      totalOperations,
      successRate: totalOperations > 0 ? successfulOperations / totalOperations : 0,
      averageAttempts: totalOperations > 0 ? totalAttempts / totalOperations : 0,
      averageLatency: totalOperations > 0 ? totalLatency / totalOperations : 0
    };
  }
}