# Abstract Service Pattern Implementation

## Overview

This document describes the implementation of the **Abstract Service Pattern** in the AI Proxy Service to enable vendor-agnostic AI provider support. This architectural change eliminates AWS Bedrock vendor lock-in and enables seamless migration between different AI providers.

## Architecture Components

### 1. Abstract Interface (`AIServiceInterface`)

**File:** `src/proxy/interfaces/ai-service.interface.ts`

```typescript
export interface AIServiceInterface {
  invokeModel(request: PromptRequestDto): Promise<PromptResponse>;
  processIncidentReportFeedback(incidentReport: string): Promise<PromptResponse>;
  getAvailableProviders(): ProviderInfo[];
  getDefaultModelConfig(): { modelId: string; maxTokens: number; temperature: number };
  getProviderName(): string;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;
}
```

**Key Interfaces:**
- `AIServiceConfig`: Provider configuration settings
- `AIServiceProvider`: Provider metadata with capabilities  
- `AIServiceCapabilities`: Feature support matrix
- `ModelMapping`: Generic to provider-specific model mappings

### 2. Base Abstract Service (`BaseAIService`)

**File:** `src/proxy/services/base-ai.service.ts`

**Purpose:** Common functionality shared across all AI providers

**Key Features:**
- Common incident report processing logic
- Configuration loading with model mappings
- Helper methods for request ID generation and timing
- Abstract methods enforcing implementation requirements

**Abstract Methods:** 
- `invokeModel()` - Provider-specific model invocation
- `getProviderName()` - Returns provider identifier
- `healthCheck()` - Provider health validation
- `getDefaultModelForProvider()` - Provider's default model

### 3. AI Service Factory (`AIServiceFactory`)

**File:** `src/proxy/services/ai-service.factory.ts`

**Purpose:** Creates and manages AI service instances based on configuration

**Key Features:**
- Service instance caching for performance
- Provider capability validation
- Multi-provider support with runtime switching
- Health monitoring across all services

**Supported Providers:**
- ✅ **AWS Bedrock** (Implemented)
- 🚧 **Azure OpenAI** (Planned)
- 🚧 **Google Vertex AI** (Planned)  
- 🚧 **OpenAI Direct** (Planned)

### 4. Refactored BedrockService

**File:** `src/proxy/services/bedrock.service.ts`

**Changes Made:**
- Now extends `BaseAIService` instead of standalone implementation
- Implements required abstract methods
- Uses configuration from base class
- Maintains AWS Bedrock-specific functionality

### 5. Model Mapping Configuration

**Files:** `config/*-model-mappings.json`

**Purpose:** Enable model name translation between providers

**Examples:**
```json
// aws-model-mappings.json
{
  "gpt-4": "anthropic.claude-3-opus-20240229-v1:0",
  "claude-3-sonnet": "anthropic.claude-3-sonnet-20240229-v1:0"
}

// azure-model-mappings.json  
{
  "claude-3-opus": "gpt-4",
  "claude-3-sonnet": "gpt-4-turbo"
}
```

## Benefits Achieved

### 1. **Vendor Agnostic Architecture**
- No direct provider dependencies in business logic
- Consistent interface across all AI providers
- Easy provider switching via configuration

### 2. **Migration Readiness**
- **Current State:** AWS Bedrock lock-in
- **New State:** Ready for multi-provider support
- **Migration Effort:** Configuration change only

### 3. **Code Reusability**
- Common incident report processing
- Shared configuration management
- Consistent error handling patterns

### 4. **Extensibility**
- New providers require only interface implementation
- No changes to controller or business logic
- Model mapping system enables seamless model substitution

### 5. **Testing & Maintenance**
- Each provider can be unit tested independently
- Factory pattern enables easy mocking
- Clear separation of concerns

## Implementation Status

### ✅ **Completed**
- [x] Abstract interface definition
- [x] Base service implementation  
- [x] Factory pattern implementation
- [x] BedrockService refactoring
- [x] Controller integration
- [x] Model mapping configurations
- [x] Comprehensive testing

### 🚧 **Next Steps**

#### Phase 1: Azure OpenAI Service
```typescript
export class AzureOpenAIService extends BaseAIService {
  // Implementation using Azure OpenAI SDK
}
```

#### Phase 2: Google Vertex AI Service  
```typescript
export class GoogleVertexAIService extends BaseAIService {
  // Implementation using Google Cloud AI SDK
}
```

#### Phase 3: OpenAI Direct Service
```typescript
export class OpenAIService extends BaseAIService {
  // Implementation using OpenAI SDK
}
```

## Usage Examples

### Current Usage (AWS Bedrock)
```typescript
// Environment variable: AI_PROVIDER=aws
const aiService = await aiServiceFactory.createService();
const response = await aiService.invokeModel(request);
```

### Future Usage (Azure OpenAI)
```typescript
// Environment variable: AI_PROVIDER=azure  
const aiService = await aiServiceFactory.createService();
const response = await aiService.invokeModel(request); // Same interface!
```

### Provider Switching
```typescript
// Get Azure provider specifically
const azureProvider = { name: 'azure', displayName: 'Azure OpenAI' };
const azureService = await aiServiceFactory.createService(azureProvider);

// Get available providers
const providers = aiServiceFactory.getAvailableProviders();
```

## Configuration

### Environment Variables
```env
# Provider Selection
AI_PROVIDER=aws                    # aws|azure|google|openai
AI_REGION=us-east-1               # Provider region
AI_DEFAULT_MODEL=claude-3-sonnet   # Default model ID
AI_DEFAULT_MAX_TOKENS=1000        # Default token limit
AI_DEFAULT_TEMPERATURE=0.7        # Default temperature

# Provider-specific credentials
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AZURE_OPENAI_KEY=your_azure_key
GOOGLE_APPLICATION_CREDENTIALS=path/to/creds.json
OPENAI_API_KEY=your_openai_key
```

### Model Mapping Files
- `config/aws-model-mappings.json` - AWS Bedrock model mappings
- `config/azure-model-mappings.json` - Azure OpenAI model mappings  
- `config/google-model-mappings.json` - Google Vertex AI model mappings
- `config/openai-model-mappings.json` - OpenAI model mappings

## Migration Guide

### From AWS Bedrock to Azure OpenAI

1. **Update Environment Variables:**
   ```env
   AI_PROVIDER=azure
   AZURE_OPENAI_KEY=your_azure_key
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   ```

2. **Update Model References:** 
   ```typescript
   // Old: AWS-specific model ID
   modelId: "anthropic.claude-3-sonnet-20240229-v1:0"
   
   // New: Generic model ID (auto-mapped)  
   modelId: "claude-3-sonnet"
   ```

3. **Deploy Azure OpenAI Service Implementation**
4. **Test and Validate**

### Benefits of This Migration Path
- **Zero Code Changes** in business logic
- **Gradual Migration** - test with specific providers
- **Rollback Capability** - instant revert via config
- **A/B Testing** - run multiple providers simultaneously

## Performance Considerations

### Service Caching
- Factory caches service instances by provider+region
- Eliminates repeated initialization overhead
- Thread-safe instance management

### Health Monitoring
```typescript
// Monitor all active services
const healthStatus = await aiServiceFactory.getServicesHealth();
console.log(healthStatus);
// Output: { "aws-us-east-1": { status: "healthy" } }
```

### Memory Management
```typescript
// Clear cache during configuration changes
aiServiceFactory.clearCache();
```

## Testing Strategy

### Unit Testing
```typescript
describe('AIServiceFactory', () => {
  it('should create appropriate service based on provider', async () => {
    const awsProvider = { name: 'aws', displayName: 'AWS Bedrock' };
    const service = await factory.createService(awsProvider);
    expect(service.getProviderName()).toBe('aws');
  });
});
```

### Integration Testing
```typescript
describe('Provider Migration', () => {
  it('should handle same request across providers', async () => {
    const request = { prompt: 'Hello', modelId: 'claude-3-sonnet' };
    
    const awsService = await factory.createService({ name: 'aws' });
    const azureService = await factory.createService({ name: 'azure' });
    
    const awsResponse = await awsService.invokeModel(request);
    const azureResponse = await azureService.invokeModel(request);
    
    expect(awsResponse.response).toBeDefined();
    expect(azureResponse.response).toBeDefined();
  });
});
```

## Conclusion

The Abstract Service Pattern implementation successfully transforms the AI Proxy Service from a vendor-locked AWS Bedrock solution to a flexible, multi-provider architecture. This enables:

- **Strategic Flexibility:** Easy provider switching based on cost, performance, or feature requirements
- **Risk Mitigation:** Reduced dependency on single AI provider  
- **Future-Proofing:** Ready for new AI providers and technologies
- **Cost Optimization:** Ability to leverage best pricing across providers
- **Feature Access:** Access to unique capabilities of different providers

The implementation maintains backward compatibility while providing a clear path for future AI provider integrations.