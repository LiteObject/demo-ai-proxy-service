# Service Architecture

## Overview

This document provides detailed implementation guidance for the AI Proxy Service architecture. It focuses on the concrete classes, interfaces, and file structure that implement the design patterns described in [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md).

## Architecture Components

### 1. Core Interfaces

#### AIServiceInterface
**File:** `src/proxy/interfaces/ai-service.interface.ts`

```typescript
export interface AIServiceInterface {
  invokeModel(request: PromptRequestDto): Promise<PromptResponse>;
  processIncidentReportFeedback(incidentReport: string): Promise<PromptResponse>;
  getAvailableProviders(): ProviderInfo[];
  getDefaultModelConfig(): { modelId: string; maxTokens: number; temperature: number };
  getProviderName(): ProviderName;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;
}
```

**Supporting Types:**
- `AIServiceConfig`: Provider configuration settings
- `AIServiceProvider`: Provider metadata with capabilities  
- `AIServiceCapabilities`: Feature support matrix
- `ModelMapping`: Generic to provider-specific model mappings

### 2. Base Service Implementation

#### BaseAIService (Abstract Class)
**File:** `src/proxy/services/base-ai.service.ts`

**Purpose:** Shared functionality across all AI providers

**Concrete Implementations:**
- Incident report processing with system prompt injection
- Request ID generation and correlation tracking
- Performance timing and structured logging
- Common error handling patterns
- Model mapping and configuration loading

**Abstract Methods (Must Implement):**
```typescript
abstract invokeModel(request: PromptRequestDto): Promise<PromptResponse>;
abstract getProviderName(): ProviderName;
abstract healthCheck(): Promise<HealthStatus>;
abstract getDefaultModelForProvider(): string;
```

**Shared Services Integration:**
- `EnhancedLoggerService`: Structured logging with correlation IDs
- `RetryService`: Exponential backoff retry logic
- `SystemPromptLoader`: Cached prompt loading

### 3. Service Factory

#### AIServiceFactory
**File:** `src/proxy/services/ai-service.factory.ts`

**Key Features:**
- **Service Caching**: Prevents expensive re-instantiation
- **Race Condition Prevention**: In-flight promise tracking
- **Type Safety**: Strict `ProviderName` validation
- **Health Monitoring**: Cross-provider status aggregation
- **Dependency Injection**: Supplies shared services to adapters

**Provider Registration:**
```typescript
private async instantiateService(provider: ProviderName): Promise<AIServiceInterface> {
  switch (provider) {
    case 'aws':
      return new BedrockService(this.logger, this.retryService);
    case 'azure':
      return new AzureOpenAIService(this.logger, this.retryService);
    // ... additional providers
    default:
      throw new ProviderNotImplementedError(provider);
  }
}
```

**Caching Strategy:**
- Key: `${provider}-${region}` for provider-region combinations
- TTL: Services cached indefinitely until explicit invalidation
- Thread Safety: Map-based locking prevents duplicate instantiation

### 4. Provider Implementations

#### BedrockService (Production Ready)
**File:** `src/proxy/services/bedrock.service.ts`

**Implementation Details:**
- Extends `BaseAIService` with AWS Bedrock SDK integration
- Handles AWS credential management and regional endpoints
- Maps generic model names to Bedrock-specific identifiers
- Implements Bedrock-specific error handling and retry logic
- Provides detailed health checks including service quotas

**Request Translation:**
```typescript
// Generic DTO → Bedrock SDK Parameters
const bedrockRequest = {
  modelId: this.mapModelId(request.modelId),
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-04",
    max_tokens: request.maxTokens || this.defaultMaxTokens,
    temperature: request.temperature || this.defaultTemperature,
    messages: [{ role: "user", content: request.prompt }]
  })
};
```

**Response Normalization:**
```typescript
// Bedrock Response → Standard PromptResponse
return {
  id: this.generateRequestId(),
  content: response.content[0].text,
  modelId: request.modelId,
  usage: {
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens
  },
  provider: 'aws',
  timestamp: new Date().toISOString(),
  processingTimeMs: Date.now() - startTime
};
```

#### Future Provider Implementations

**AzureOpenAIService** (Planned)
- Azure OpenAI SDK integration
- Azure AD authentication handling
- Regional deployment management

**GoogleVertexAIService** (Planned)
- Google Cloud AI Platform integration
- Service account credential management
- Multi-regional endpoint support

**OpenAIService** (Planned)
- Direct OpenAI API integration
- API key management
- Rate limiting compliance

**OllamaService** (Extensible)
- Local model serving via HTTP API
- Dynamic model discovery
- Resource monitoring and management

### 5. Configuration Management

#### Provider Type Definitions
**File:** `src/proxy/types/provider.types.ts`

```typescript
export type ProviderName = 'aws' | 'azure' | 'google' | 'openai' | 'ollama';

export const PROVIDER_DEFINITIONS: Record<ProviderName, ProviderDefinition> = {
  aws: {
    name: 'aws',
    displayName: 'AWS Bedrock',
    defaultRegion: 'us-east-1',
    capabilities: {
      supportsStreaming: true,
      maxContextTokens: 200000,
      supportedModalities: ['text'],
      rateLimits: { requestsPerMinute: 1000, tokensPerMinute: 50000 }
    }
  },
  // ... additional providers
};
```

#### Model Mapping Files
**Location:** `config/*-model-mappings.json`

**Purpose:** Enable model alias resolution and cross-provider compatibility

**AWS Bedrock Example:**
```json
{
  "claude-3-opus": "anthropic.claude-3-opus-20240229-v1:0",
  "claude-3-sonnet": "anthropic.claude-3-sonnet-20240229-v1:0",
  "claude-3-haiku": "anthropic.claude-3-haiku-20240307-v1:0",
  "gpt-4-equivalent": "anthropic.claude-3-opus-20240229-v1:0"
}
```

**Benefits:**
- Provider-agnostic model references in client code
- Easy model substitution for A/B testing
- Cost optimization through model selection
- Migration path between providers

### 6. Error Handling Architecture

#### Exception Hierarchy
**File:** `src/proxy/exceptions/provider.exceptions.ts`

```typescript
export abstract class AIProviderError extends Error {
  abstract readonly isRetryable: boolean;
  abstract readonly errorCategory: ErrorCategory;
  abstract readonly provider: ProviderName;
}

export class BedrockConnectionError extends AIProviderError {
  readonly isRetryable = true;
  readonly errorCategory = 'network';
  readonly provider = 'aws';
}

export class BedrockRateLimitError extends AIProviderError {
  readonly isRetryable = true;
  readonly errorCategory = 'rate_limit';
  readonly provider = 'aws';
  
  constructor(
    message: string,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
  }
}
```

**Error Categories:**
- `network`: Connection timeouts, DNS failures
- `authentication`: Invalid credentials, expired tokens
- `rate_limit`: Quota exceeded, throttling
- `model`: Invalid model, unsupported parameters
- `input`: Malformed request, content policy violations
- `unknown`: Unexpected provider errors

#### Retry Logic Integration
Each provider service integrates with `RetryService` for intelligent error recovery:

```typescript
const result = await this.retryService.executeWithRetry(
  () => this.invokeBedrockModel(request),
  (error) => error instanceof BedrockConnectionError || 
           error instanceof BedrockRateLimitError,
  { maxRetries: 3, baseDelayMs: 1000, backoffMultiplier: 2 }
);
```

### 7. Cross-Cutting Concerns

#### Enhanced Logging
**Integration:** All services receive `EnhancedLoggerService` via dependency injection

**Structured Log Example:**
```json
{
  "timestamp": "2025-09-17T14:30:00.000Z",
  "level": "INFO",
  "message": "Model invocation completed",
  "context": "BedrockService",
  "metadata": {
    "requestId": "aws-1726498294071-abc123",
    "duration": 2847,
    "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "provider": "aws",
    "inputTokens": 45,
    "outputTokens": 128,
    "success": true
  },
  "traceId": "def456ghi789",
  "correlationId": "req-xyz123"
}
```

#### System Prompt Management
**File:** `src/proxy/services/system-prompt-loader.service.ts`

**Features:**
- Asynchronous file loading with caching
- mtime-based cache invalidation
- Memory-efficient prompt storage
- Error resilience with fallback prompts

**Usage Pattern:**
```typescript
export class BaseAIService {
  async processIncidentReportFeedback(incidentReport: string): Promise<PromptResponse> {
    const systemPrompt = await this.systemPromptLoader.getIncidentPrompt();
    const fullPrompt = `${systemPrompt}\n\nIncident Report: ${incidentReport}`;
    return this.invokeModel({ prompt: fullPrompt, /* ... */ });
  }
}
```

## Implementation Status

### ✅ Production Ready
- **BaseAIService**: Complete with all cross-cutting concerns
- **BedrockService**: Full AWS Bedrock integration
- **AIServiceFactory**: Type-safe creation with caching
- **Error Handling**: Comprehensive exception hierarchy
- **Logging**: Structured logging with correlation tracking

### 🚧 In Development
- **AzureOpenAIService**: Azure SDK integration pending
- **GoogleVertexAIService**: Google Cloud integration planned
- **OpenAIService**: Direct API integration planned

### 🔮 Future Enhancements
- **Circuit Breaker**: Failure isolation and recovery
- **Request Caching**: Response caching with TTL
- **Load Balancing**: Multi-provider request distribution
- **Streaming Support**: Real-time response delivery

## Migration and Deployment

### Environment Configuration
```env
# Core Provider Selection
AI_PROVIDER=aws                        # Primary provider
AI_FALLBACK_PROVIDERS=azure,openai     # Fallback chain

# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Azure Configuration (when implemented)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your_azure_key

# Shared Configuration
DEFAULT_MAX_TOKENS=1000
DEFAULT_TEMPERATURE=0.7
ENABLE_MODEL_FALLBACK=true
```

### Provider Addition Checklist
1. **Define Provider Type**: Add to `ProviderName` union type
2. **Implement Service**: Extend `BaseAIService` with provider-specific logic
3. **Register Factory**: Add instantiation logic to `AIServiceFactory`
4. **Configure Models**: Create model mapping JSON file
5. **Add Tests**: Unit and integration tests for new provider
6. **Update Documentation**: Add provider details to this document
7. **Environment Setup**: Document required configuration variables

### Health Monitoring
Each provider implements health checks that validate:
- Credential validity and permissions
- Network connectivity to provider endpoints
- Service quota availability
- Model accessibility and readiness

**Aggregated Health Status:**
```typescript
const healthStatus = await aiServiceFactory.getServicesHealth();
// Returns: Map<ProviderName, HealthStatus>
```

This architecture provides a solid foundation for multi-provider AI integration while maintaining clean separation of concerns and extensive observability.