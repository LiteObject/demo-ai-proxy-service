import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIServiceInterface, AIServiceProvider } from '../interfaces/ai-service.interface';
import { BedrockService } from './bedrock.service';
// Future imports for other providers
// import { AzureOpenAIService } from './azure-openai.service';
// import { GoogleVertexAIService } from './google-vertex-ai.service';
// import { OpenAIService } from './openai.service';

@Injectable()
export class AIServiceFactory {
  private readonly logger = new Logger(AIServiceFactory.name);
  private serviceCache = new Map<string, AIServiceInterface>();

  constructor(private configService: ConfigService) {}

  /**
   * Creates or retrieves a cached AI service instance based on provider configuration
   */
  async createService(provider?: AIServiceProvider): Promise<AIServiceInterface> {
    const targetProvider = provider || this.getDefaultProvider();
    const cacheKey = `${targetProvider.name}-${targetProvider.region || 'default'}`;

    // Return cached service if available
    if (this.serviceCache.has(cacheKey)) {
      this.logger.debug(`🔄 Using cached ${targetProvider.name} service instance`);
      return this.serviceCache.get(cacheKey)!;
    }

    // Create new service instance
    const service = await this.instantiateService(targetProvider);
    
    // Cache the service for reuse
    this.serviceCache.set(cacheKey, service);
    
    this.logger.log(`🏭 Created new ${targetProvider.name} service instance`);
    return service;
  }

  /**
   * Gets the currently configured default provider
   */
  getDefaultProvider(): AIServiceProvider {
    const providerName = this.configService.get<string>('AI_PROVIDER', 'aws').toLowerCase();
    
    const providers: Record<string, AIServiceProvider> = {
      aws: {
        name: 'aws',
        displayName: 'AWS Bedrock',
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
        capabilities: {
          textGeneration: true,
          chatCompletion: true,
          imageGeneration: false,
          embeddingGeneration: false,
          functionCalling: false
        }
      },
      azure: {
        name: 'azure',
        displayName: 'Azure OpenAI',
        region: this.configService.get<string>('AZURE_REGION', 'eastus'),
        capabilities: {
          textGeneration: true,
          chatCompletion: true,
          imageGeneration: false,
          embeddingGeneration: true,
          functionCalling: true
        }
      },
      google: {
        name: 'google',
        displayName: 'Google Vertex AI',
        region: this.configService.get<string>('GOOGLE_REGION', 'us-central1'),
        capabilities: {
          textGeneration: true,
          chatCompletion: true,
          imageGeneration: false,
          embeddingGeneration: true,
          functionCalling: false
        }
      },
      openai: {
        name: 'openai',
        displayName: 'OpenAI',
        capabilities: {
          textGeneration: true,
          chatCompletion: true,
          imageGeneration: true,
          embeddingGeneration: true,
          functionCalling: true
        }
      }
    };

    const provider = providers[providerName];
    if (!provider) {
      throw new Error(`Unsupported AI provider: ${providerName}. Supported providers: ${Object.keys(providers).join(', ')}`);
    }

    return provider;
  }

  /**
   * Lists all available providers with their capabilities
   */
  getAvailableProviders(): AIServiceProvider[] {
    return [
      {
        name: 'aws',
        displayName: 'AWS Bedrock',
        capabilities: {
          textGeneration: true,
          chatCompletion: true,
          imageGeneration: false,
          embeddingGeneration: false,
          functionCalling: false
        }
      },
      {
        name: 'azure',
        displayName: 'Azure OpenAI',
        capabilities: {
          textGeneration: true,
          chatCompletion: true,
          imageGeneration: false,
          embeddingGeneration: true,
          functionCalling: true
        }
      },
      {
        name: 'google',
        displayName: 'Google Vertex AI',
        capabilities: {
          textGeneration: true,
          chatCompletion: true,
          imageGeneration: false,
          embeddingGeneration: true,
          functionCalling: false
        }
      },
      {
        name: 'openai',
        displayName: 'OpenAI',
        capabilities: {
          textGeneration: true,
          chatCompletion: true,
          imageGeneration: true,
          embeddingGeneration: true,
          functionCalling: true
        }
      }
    ];
  }

  /**
   * Validates if a provider supports a specific capability
   */
  validateProviderCapability(provider: AIServiceProvider, capability: keyof AIServiceProvider['capabilities']): boolean {
    return provider.capabilities[capability] === true;
  }

  /**
   * Clears the service cache (useful for testing or configuration changes)
   */
  clearCache(): void {
    this.serviceCache.clear();
    this.logger.log('🗑️ AI service cache cleared');
  }

  /**
   * Gets health status of all cached services
   */
  async getServicesHealth(): Promise<Record<string, { status: 'healthy' | 'unhealthy'; details?: string }>> {
    const healthStatuses: Record<string, { status: 'healthy' | 'unhealthy'; details?: string }> = {};

    for (const [key, service] of this.serviceCache.entries()) {
      try {
        healthStatuses[key] = await service.healthCheck();
      } catch (error) {
        healthStatuses[key] = {
          status: 'unhealthy',
          details: error.message
        };
      }
    }

    return healthStatuses;
  }

  /**
   * Private method to instantiate the appropriate service based on provider
   */
  private async instantiateService(provider: AIServiceProvider): Promise<AIServiceInterface> {
    switch (provider.name.toLowerCase()) {
      case 'aws':
        return new BedrockService(this.configService);
        
      case 'azure':
        // TODO: Implement Azure OpenAI Service
        // return new AzureOpenAIService(this.configService);
        throw new Error('Azure OpenAI service implementation is not yet available');
        
      case 'google':
        // TODO: Implement Google Vertex AI Service
        // return new GoogleVertexAIService(this.configService);
        throw new Error('Google Vertex AI service implementation is not yet available');
        
      case 'openai':
        // TODO: Implement OpenAI Service
        // return new OpenAIService(this.configService);
        throw new Error('OpenAI service implementation is not yet available');
        
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }
}