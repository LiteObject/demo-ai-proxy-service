import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIServiceInterface } from '../interfaces/ai-service.interface';
import { BedrockService } from './bedrock.service';
import { SystemPromptLoader } from './system-prompt-loader.service';
import { RetryService } from '../../common/retry.service';
import { EnhancedLoggerService } from '../../common/enhanced-logger.service';
import { 
  ProviderName, 
  AIServiceProvider, 
  PROVIDER_DEFINITIONS, 
  isValidProviderName,
  getValidProviderNames
} from '../types/provider.types';
import { 
  ProviderNotImplementedError, 
  InvalidProviderError, 
  ProviderCapabilityError,
  ServiceCreationError
} from '../exceptions/provider.exceptions';
// Future imports for other providers
// import { AzureOpenAIService } from './azure-openai.service';
// import { GoogleVertexAIService } from './google-vertex-ai.service';
// import { OpenAIService } from './openai.service';

@Injectable()
export class AIServiceFactory {
  private readonly logger = new Logger(AIServiceFactory.name);
  private serviceCache = new Map<string, AIServiceInterface>();
  private inFlight = new Map<string, Promise<AIServiceInterface>>(); // Prevent race conditions

  constructor(
    private configService: ConfigService,
    private systemPromptLoader: SystemPromptLoader,
    private retryService?: RetryService,
    private enhancedLogger?: EnhancedLoggerService
  ) {}

  /**
   * Creates or retrieves a cached AI service instance based on provider configuration
   */
  async createService(provider?: AIServiceProvider): Promise<AIServiceInterface> {
    const targetProvider = provider || this.getDefaultProvider();
    const cacheKey = this.generateCacheKey(targetProvider);

    // Return cached service if available
    if (this.serviceCache.has(cacheKey)) {
      this.logger.debug(`🔄 Using cached ${targetProvider.displayName} service instance`);
      return this.serviceCache.get(cacheKey)!;
    }

    // Check if creation is already in progress to prevent race conditions
    if (this.inFlight.has(cacheKey)) {
      this.logger.debug(`⏳ Waiting for in-progress ${targetProvider.displayName} service creation`);
      return this.inFlight.get(cacheKey)!;
    }

    // Create new service instance
    const creationPromise = this.instantiateService(targetProvider)
      .then(service => {
        this.serviceCache.set(cacheKey, service);
        this.inFlight.delete(cacheKey);
        this.logger.log(`🏭 Created new ${targetProvider.displayName} service instance`);
        return service;
      })
      .catch(error => {
        this.inFlight.delete(cacheKey);
        throw new ServiceCreationError(targetProvider.name as ProviderName, error);
      });

    this.inFlight.set(cacheKey, creationPromise);
    return creationPromise;
  }

  /**
   * Gets the currently configured default provider with strict typing
   */
  getDefaultProvider(): AIServiceProvider {
    const providerName = this.configService.get<string>('AI_PROVIDER', 'aws').toLowerCase();
    
    if (!isValidProviderName(providerName)) {
      throw new InvalidProviderError(
        providerName, 
        getValidProviderNames()
      );
    }

    const definition = PROVIDER_DEFINITIONS[providerName];
    
    return {
      ...definition,
      region: this.resolveRegion(providerName)
    };
  }

  /**
   * Lists all available providers with their capabilities
   */
  getAvailableProviders(): AIServiceProvider[] {
    return (Object.keys(PROVIDER_DEFINITIONS) as ProviderName[]).map(providerName => ({
      ...PROVIDER_DEFINITIONS[providerName],
      region: this.resolveRegion(providerName)
    }));
  }

  /**
   * Validates if a provider supports a specific capability
   * Now throws descriptive errors instead of returning boolean
   */
  validateProviderCapability(
    provider: AIServiceProvider, 
    capability: keyof AIServiceProvider['capabilities']
  ): void {
    if (!provider.capabilities[capability]) {
      throw new ProviderCapabilityError(provider.name as ProviderName, capability);
    }
  }

  /**
   * Checks if a provider supports a capability (non-throwing version)
   */
  supportsCapability(
    provider: AIServiceProvider, 
    capability: keyof AIServiceProvider['capabilities']
  ): boolean {
    return provider.capabilities[capability] === true;
  }

  /**
   * Clears the service cache (useful for testing or configuration changes)
   */
  clearCache(): void {
    this.serviceCache.clear();
    this.inFlight.clear();
    this.logger.log('🗑️ AI service cache cleared');
  }

  /**
   * Gets health status of all cached services with enhanced error details
   */
  async getServicesHealth(): Promise<Record<string, { 
    status: 'healthy' | 'unhealthy'; 
    details?: string;
    timestamp: string;
    provider: string;
  }>> {
    const healthStatuses: Record<string, any> = {};

    for (const [key, service] of this.serviceCache.entries()) {
      try {
        const health = await service.healthCheck();
        healthStatuses[key] = {
          ...health,
          timestamp: new Date().toISOString(),
          provider: service.getProviderName()
        };
      } catch (error: any) {
        healthStatuses[key] = {
          status: 'unhealthy',
          details: error.message,
          timestamp: new Date().toISOString(),
          provider: 'unknown',
          error: error.name
        };
      }
    }

    return healthStatuses;
  }

  /**
   * Resolves the appropriate region for a provider
   */
  private resolveRegion(providerName: ProviderName): string | undefined {
    const regionMapping: Record<ProviderName, string> = {
      aws: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      azure: this.configService.get<string>('AZURE_REGION', 'eastus'),
      google: this.configService.get<string>('GOOGLE_REGION', 'us-central1'),
      openai: 'global' // OpenAI doesn't use regions
    };

    return regionMapping[providerName];
  }

  /**
   * Generates a consistent cache key for service instances
   */
  private generateCacheKey(provider: AIServiceProvider): string {
    return `${provider.name}-${provider.region || 'default'}`;
  }

  /**
   * Private method to instantiate the appropriate service based on provider
   */
  private async instantiateService(provider: AIServiceProvider): Promise<AIServiceInterface> {
    switch (provider.name.toLowerCase()) {
      case 'aws':
        return new BedrockService(this.configService, this.systemPromptLoader, this.retryService, this.enhancedLogger);
        
      case 'azure':
        // TODO: Implement Azure OpenAI Service
        // return new AzureOpenAIService(this.configService);
        throw new ProviderNotImplementedError(provider.name as ProviderName);
        
      case 'google':
        // TODO: Implement Google Vertex AI Service
        // return new GoogleVertexAIService(this.configService);
        throw new ProviderNotImplementedError(provider.name as ProviderName);
        
      case 'openai':
        // TODO: Implement OpenAI Service
        // return new OpenAIService(this.configService);
        throw new ProviderNotImplementedError(provider.name as ProviderName);
        
      default: {
        // This should never happen with proper typing, but TypeScript requires it
        const _exhaustiveCheck: never = provider.name as never;
        throw new Error(`Unknown provider: ${_exhaustiveCheck}`);
      }
    }
  }
}