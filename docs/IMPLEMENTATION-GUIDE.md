# Implementation Guide

## Overview

This guide provides step-by-step instructions for extending the AI Proxy Service with new providers, features, and enhancements. It focuses on practical implementation tasks and common development scenarios.

## Quick Reference

| Task | Primary Files | Key Concepts |
|------|---------------|--------------|
| Add New Provider | `provider.types.ts`, `new-provider.service.ts`, `ai-service.factory.ts` | Adapter Pattern, Factory Registration |
| Modify Request/Response | `*.dto.ts`, `BaseAIService` | DTO Validation, Response Normalization |
| Add Cross-Cutting Feature | `BaseAIService`, Service constructors | Dependency Injection, Shared Concerns |
| Update Error Handling | `provider.exceptions.ts`, Provider services | Exception Hierarchy, Retry Logic |
| Configure New Environment | `.env`, `config.schema.ts` | Configuration Validation, Environment Variables |

## Adding a New AI Provider

### Step 1: Define Provider Metadata

**File:** `src/proxy/types/provider.types.ts`

```typescript
// 1. Add to ProviderName union type
export type ProviderName = 'aws' | 'azure' | 'google' | 'openai' | 'ollama' | 'your_provider';

// 2. Add provider definition
export const PROVIDER_DEFINITIONS: Record<ProviderName, ProviderDefinition> = {
  // ... existing providers
  your_provider: {
    name: 'your_provider',
    displayName: 'Your Provider Name',
    defaultRegion: 'us-east-1', // or applicable region
    capabilities: {
      supportsStreaming: false,
      maxContextTokens: 4096,
      supportedModalities: ['text'],
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 10000
      }
    }
  }
};
```

### Step 2: Implement Provider Service

**File:** `src/proxy/services/your-provider.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { BaseAIService } from './base-ai.service';
import { PromptRequestDto } from '../dto/prompt-request.dto';
import { PromptResponse } from '../dto/prompt-response.dto';
import { ProviderName } from '../types/provider.types';

@Injectable()
export class YourProviderService extends BaseAIService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    logger: EnhancedLoggerService,
    retryService: RetryService
  ) {
    super(logger, retryService);
    this.apiKey = process.env.YOUR_PROVIDER_API_KEY!;
    this.baseUrl = process.env.YOUR_PROVIDER_BASE_URL || 'https://api.yourprovider.com';
    
    this.validateConfiguration();
  }

  getProviderName(): ProviderName {
    return 'your_provider';
  }

  async invokeModel(request: PromptRequestDto): Promise<PromptResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Transform generic request to provider-specific format
      const providerRequest = this.transformRequest(request);
      
      // Execute with retry logic
      const result = await this.retryService.executeWithRetry(
        () => this.callProviderAPI(providerRequest),
        (error) => this.isRetryableError(error),
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      // Transform provider response to standard format
      return this.transformResponse(result, requestId, startTime);
      
    } catch (error) {
      this.logger.error('Provider API call failed', {
        requestId,
        provider: this.getProviderName(),
        error: error.message
      });
      throw this.mapError(error);
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      // Implement provider-specific health check
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        details: response.ok ? 'Provider is responding' : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: error.message
      };
    }
  }

  private transformRequest(request: PromptRequestDto): any {
    // Map generic request fields to provider-specific format
    return {
      prompt: request.prompt,
      model: this.mapModelId(request.modelId),
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      // Add provider-specific parameters
    };
  }

  private transformResponse(providerResponse: any, requestId: string, startTime: number): PromptResponse {
    return {
      id: requestId,
      content: providerResponse.generated_text || providerResponse.output,
      modelId: providerResponse.model || 'unknown',
      usage: {
        promptTokens: providerResponse.usage?.prompt_tokens || 0,
        completionTokens: providerResponse.usage?.completion_tokens || 0,
        totalTokens: providerResponse.usage?.total_tokens || 0
      },
      provider: this.getProviderName(),
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  private async callProviderAPI(request: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Provider API error: ${response.status} ${errorBody}`);
    }

    return response.json();
  }

  private mapError(error: any): Error {
    // Map provider-specific errors to standard exception types
    if (error.message.includes('rate limit')) {
      return new YourProviderRateLimitError(error.message);
    }
    if (error.message.includes('authentication')) {
      return new YourProviderAuthenticationError(error.message);
    }
    return new YourProviderError(error.message);
  }

  private isRetryableError(error: any): boolean {
    return error instanceof YourProviderRateLimitError ||
           error.message.includes('timeout') ||
           error.message.includes('connection');
  }

  private validateConfiguration(): void {
    if (!this.apiKey) {
      throw new Error('YOUR_PROVIDER_API_KEY environment variable is required');
    }
  }
}
```

### Step 3: Register with Factory

**File:** `src/proxy/services/ai-service.factory.ts`

```typescript
private async instantiateService(provider: ProviderName): Promise<AIServiceInterface> {
  switch (provider) {
    case 'aws':
      return new BedrockService(this.logger, this.retryService);
    case 'your_provider':  // Add this case
      return new YourProviderService(this.logger, this.retryService);
    // ... other cases
    default:
      throw new ProviderNotImplementedError(provider);
  }
}
```

### Step 4: Add Provider Exceptions

**File:** `src/proxy/exceptions/your-provider.exceptions.ts`

```typescript
import { AIProviderError } from './provider.exceptions';

export class YourProviderError extends AIProviderError {
  readonly isRetryable = false;
  readonly errorCategory = 'unknown';
  readonly provider = 'your_provider';
}

export class YourProviderRateLimitError extends AIProviderError {
  readonly isRetryable = true;
  readonly errorCategory = 'rate_limit';
  readonly provider = 'your_provider';
}

export class YourProviderAuthenticationError extends AIProviderError {
  readonly isRetryable = false;
  readonly errorCategory = 'authentication';
  readonly provider = 'your_provider';
}
```

### Step 5: Add Model Mapping (Optional)

**File:** `config/your-provider-model-mappings.json`

```json
{
  "gpt-4": "your-provider-premium-model",
  "gpt-3.5-turbo": "your-provider-standard-model",
  "claude-3": "your-provider-large-model"
}
```

### Step 6: Update Configuration Schema

**File:** `src/common/config.schema.ts`

```typescript
export const configurationSchema = Joi.object({
  // ... existing configuration
  YOUR_PROVIDER_API_KEY: Joi.string().when('AI_PROVIDER', {
    is: 'your_provider',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  YOUR_PROVIDER_BASE_URL: Joi.string().uri().optional(),
});
```

### Step 7: Add Tests

**File:** `test/unit/your-provider.service.spec.ts`

```typescript
describe('YourProviderService', () => {
  let service: YourProviderService;
  let mockLogger: jest.Mocked<EnhancedLoggerService>;
  let mockRetryService: jest.Mocked<RetryService>;

  beforeEach(async () => {
    mockLogger = createMock<EnhancedLoggerService>();
    mockRetryService = createMock<RetryService>();
    
    service = new YourProviderService(mockLogger, mockRetryService);
  });

  describe('invokeModel', () => {
    it('should transform request and response correctly', async () => {
      const request: PromptRequestDto = {
        prompt: 'Test prompt',
        modelId: 'gpt-4',
        maxTokens: 100,
        temperature: 0.5
      };

      // Mock the provider API response
      const mockResponse = {
        generated_text: 'Test response',
        model: 'your-provider-premium-model',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      };

      jest.spyOn(service as any, 'callProviderAPI').mockResolvedValue(mockResponse);
      mockRetryService.executeWithRetry.mockImplementation((fn) => fn());

      const result = await service.invokeModel(request);

      expect(result.content).toBe('Test response');
      expect(result.provider).toBe('your_provider');
      expect(result.usage.totalTokens).toBe(30);
    });

    it('should handle rate limit errors', async () => {
      const request: PromptRequestDto = { prompt: 'Test' };
      
      jest.spyOn(service as any, 'callProviderAPI')
        .mockRejectedValue(new Error('rate limit exceeded'));

      await expect(service.invokeModel(request))
        .rejects.toThrow(YourProviderRateLimitError);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when provider is available', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await service.healthCheck();
      expect(result.status).toBe('healthy');
    });
  });
});
```

## Common Development Tasks

### Modifying Request/Response DTOs

**When to modify:** Adding new parameters, changing validation rules, or supporting new response fields.

**Files to update:**
1. `src/proxy/dto/prompt-request.dto.ts` - Input validation
2. `src/proxy/dto/prompt-response.dto.ts` - Output structure
3. All provider services - Request/response transformation logic
4. Tests - Update mock data and assertions

**Example - Adding temperature range validation:**
```typescript
// In prompt-request.dto.ts
@IsNumber()
@Min(0.0)
@Max(2.0)
@IsOptional()
temperature?: number;
```

### Adding Cross-Cutting Features

**Example:** Adding request tracing

1. **Update BaseAIService:**
```typescript
export abstract class BaseAIService {
  protected generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async invokeModel(request: PromptRequestDto): Promise<PromptResponse> {
    const traceId = this.generateTraceId();
    // Add tracing logic
  }
}
```

2. **Update Response DTO:**
```typescript
export class PromptResponse {
  // ... existing fields
  traceId?: string;
}
```

### Environment Configuration Best Practices

**Configuration hierarchy:**
1. Environment variables (highest priority)
2. `.env` file
3. Default values in code (lowest priority)

**Example configuration pattern:**
```typescript
export class ConfigService {
  get yourProviderConfig() {
    return {
      apiKey: process.env.YOUR_PROVIDER_API_KEY,
      baseUrl: process.env.YOUR_PROVIDER_BASE_URL || 'https://default-api.com',
      timeout: parseInt(process.env.YOUR_PROVIDER_TIMEOUT_MS || '30000'),
      retries: parseInt(process.env.YOUR_PROVIDER_MAX_RETRIES || '3')
    };
  }
}
```

## Advanced Implementation Patterns

### Streaming Responses

For providers that support streaming:

```typescript
async *invokeModelStream(request: PromptRequestDto): AsyncGenerator<PartialResponse> {
  const stream = await this.callProviderStreamingAPI(request);
  
  for await (const chunk of stream) {
    yield {
      content: this.extractChunkContent(chunk),
      isComplete: chunk.isLast,
      metadata: this.extractChunkMetadata(chunk)
    };
  }
}
```

### Circuit Breaker Pattern

For enhanced resilience:

```typescript
@Injectable()
export class CircuitBreakerService {
  private circuits = new Map<string, CircuitBreaker>();

  async executeWithCircuitBreaker<T>(
    key: string,
    operation: () => Promise<T>,
    options: CircuitBreakerOptions = {}
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(key, options);
    return circuit.execute(operation);
  }
}
```

### Request Caching

For performance optimization:

```typescript
@Injectable()
export class CacheService {
  private cache = new Map<string, CachedResponse>();

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number = 300000
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached, ttlMs)) {
      return cached.value as T;
    }

    const value = await factory();
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }
}
```

## Testing Strategies

### Unit Testing Checklist

- [ ] Request transformation accuracy
- [ ] Response normalization
- [ ] Error mapping and classification
- [ ] Retry logic behavior
- [ ] Health check functionality
- [ ] Configuration validation

### Integration Testing

```typescript
describe('YourProvider Integration', () => {
  it('should handle end-to-end request flow', async () => {
    const factory = new AIServiceFactory(logger, retryService);
    const service = await factory.createService('your_provider');
    
    const response = await service.invokeModel({
      prompt: 'Hello, world!',
      modelId: 'gpt-4'
    });
    
    expect(response.content).toBeDefined();
    expect(response.provider).toBe('your_provider');
  });
});
```

### Performance Testing

Monitor key metrics:
- Response time percentiles (P50, P95, P99)
- Token processing rate
- Error rates by category
- Memory usage during sustained load

## Migration and Deployment

### Rolling Provider Updates

1. **Blue-Green Deployment:** Deploy new provider alongside existing
2. **Gradual Traffic Shift:** Route small percentage to new provider
3. **Monitor Metrics:** Compare performance and error rates
4. **Full Cutover:** Switch all traffic once validated

### Configuration Management

Use environment-specific configurations:

```yaml
# development.env
AI_PROVIDER=aws
DEBUG_LEVEL=verbose
ENABLE_REQUEST_LOGGING=true

# production.env
AI_PROVIDER=aws,azure  # Multiple providers with fallback
DEBUG_LEVEL=error
ENABLE_REQUEST_LOGGING=false
ENABLE_METRICS=true
```

## Troubleshooting Guide

### Common Issues

**Provider Service Not Found:**
- Check `ProviderName` type definition
- Verify factory registration
- Ensure environment variables are set

**Request Transformation Errors:**
- Validate DTO schema matches provider expectations
- Check model mapping configuration
- Verify parameter type conversions

**Authentication Failures:**
- Confirm API keys are correctly configured
- Check credential expiration
- Validate permission scopes

**Rate Limiting:**
- Implement exponential backoff
- Monitor usage quotas
- Consider request queuing

### Debug Logging

Enable detailed logging for troubleshooting:

```env
LOG_LEVEL=DEBUG
ENABLE_STRUCTURED_LOGGING=true
ENABLE_REQUEST_TRACING=true
```

This implementation guide provides the foundation for extending and maintaining the AI Proxy Service. Follow these patterns to ensure consistency, reliability, and maintainability across all provider integrations.