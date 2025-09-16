import { ProviderName, AIServiceCapabilities } from '../types/provider.types';

/**
 * Base class for all AI provider-related exceptions
 */
export abstract class AIProviderError extends Error {
  public readonly timestamp: string;
  public readonly isRetryable: boolean;
  
  constructor(
    message: string,
    public readonly provider: ProviderName,
    retryable: boolean = false
  ) {
    super(message);
    this.timestamp = new Date().toISOString();
    this.isRetryable = retryable;
  }
}

export class ProviderNotImplementedError extends AIProviderError {
  constructor(provider: ProviderName) {
    super(`Provider '${provider}' is not yet implemented`, provider, false);
    this.name = 'ProviderNotImplementedError';
  }
}

export class InvalidProviderError extends AIProviderError {
  constructor(
    public readonly invalidProvider: string, 
    public readonly validProviders: ProviderName[]
  ) {
    super(
      `Invalid provider '${invalidProvider}'. Valid providers: ${validProviders.join(', ')}`, 
      'aws', // Default provider for error context
      false
    );
    this.name = 'InvalidProviderError';
  }
}

export class ProviderCapabilityError extends AIProviderError {
  constructor(
    provider: ProviderName, 
    public readonly capability: keyof AIServiceCapabilities,
    public readonly remediation?: string
  ) {
    const message = `Provider '${provider}' does not support capability '${capability}'`;
    const fullMessage = remediation ? `${message}. ${remediation}` : message;
    
    super(fullMessage, provider, false);
    this.name = 'ProviderCapabilityError';
  }
}

export class ServiceCreationError extends AIProviderError {
  public readonly cause: Error;
  
  constructor(provider: ProviderName, public readonly originalError: Error) {
    const isRetryable = ServiceCreationError.isTransientError(originalError);
    super(
      `Failed to create service for provider '${provider}': ${originalError.message}`, 
      provider, 
      isRetryable
    );
    this.name = 'ServiceCreationError';
    this.cause = originalError;
  }

  private static isTransientError(error: any): boolean {
    const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];
    const transientMessages = ['timeout', 'connection', 'network'];
    
    return transientCodes.includes(error.code) ||
           transientMessages.some(msg => error.message?.toLowerCase().includes(msg));
  }

  // Public method for checking transient errors
  public static isErrorTransient(error: any): boolean {
    return ServiceCreationError.isTransientError(error);
  }
}

export class ModelInvocationError extends AIProviderError {
  constructor(
    provider: ProviderName,
    public readonly modelId: string,
    public readonly originalError: Error,
    public readonly metadata?: Record<string, any>
  ) {
    const isRetryable = ModelInvocationError.isTransientError(originalError);
    super(
      `Model invocation failed for ${modelId} on provider '${provider}': ${originalError.message}`,
      provider,
      isRetryable
    );
    this.name = 'ModelInvocationError';
  }

  private static isTransientError(error: any): boolean {
    // AWS Bedrock specific transient errors
    const transientStatuses = [429, 500, 502, 503, 504];
    const transientErrorCodes = ['ThrottlingException', 'InternalServerException'];
    
    return transientStatuses.includes(error.$metadata?.httpStatusCode) ||
           transientErrorCodes.includes(error.name) ||
           ServiceCreationError.isErrorTransient(error);
  }
}