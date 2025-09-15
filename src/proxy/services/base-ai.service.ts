import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIServiceInterface, AIServiceConfig } from '../interfaces/ai-service.interface';
import { PromptRequestDto } from '../dto/prompt-request.dto';
import { PromptResponse } from '../dto/prompt-response.dto';
import { ProviderInfo } from '../dto/providers-response.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export abstract class BaseAIService implements AIServiceInterface {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly config: AIServiceConfig;

  constructor(protected configService: ConfigService) {
    this.config = this.loadProviderConfig();
  }

  // Abstract methods that must be implemented by concrete services
  abstract invokeModel(request: PromptRequestDto): Promise<PromptResponse>;
  abstract getAvailableProviders(): ProviderInfo[];
  abstract getProviderName(): string;
  abstract healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;

  // Common implementation for incident report processing
  async processIncidentReportFeedback(incidentReport: string): Promise<PromptResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.log('📄 Processing incident report feedback request');
      
      // Read system prompt from configuration file
      const systemPromptPath = path.join(process.cwd(), 'config', 'incident-report-system-prompt.md');
      const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
      
      this.logger.debug(`📋 System prompt loaded from: ${systemPromptPath}`);
      this.logger.debug(`📝 Incident report length: ${incidentReport.length} characters`);

      // Combine system prompt with user incident report
      const combinedPrompt = `${systemPrompt}\n\n## Incident Report to Analyze:\n\n${incidentReport}`;

      // Get default configuration optimized for safety analysis
      const defaultConfig = this.getDefaultModelConfig();
      
      // Create a prompt request with the combined content and predefined settings
      const promptRequest: PromptRequestDto = {
        prompt: combinedPrompt,
        modelId: defaultConfig.modelId,
        maxTokens: 2000, // Fixed for comprehensive safety analysis
        temperature: 0.3  // Fixed for focused analytical responses
      };

      this.logger.log(`🔍 Invoking expert analysis with optimized settings for ${this.getProviderName()}`);
      
      // Use the abstract invokeModel method
      const response = await this.invokeModel(promptRequest);
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Incident report analysis completed in ${duration}ms`);
      
      return response;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Error processing incident report feedback after ${duration}ms: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Common default model configuration
  getDefaultModelConfig(): { modelId: string; maxTokens: number; temperature: number } {
    return {
      modelId: this.config.defaultModel || this.getDefaultModelForProvider(),
      maxTokens: this.config.defaultMaxTokens || 1000,
      temperature: this.config.defaultTemperature || 0.7
    };
  }

  // Protected helper methods
  protected abstract getDefaultModelForProvider(): string;

  protected mapModelId(genericModelId: string): string {
    if (!this.config.modelMappings) {
      return genericModelId;
    }
    return this.config.modelMappings[genericModelId] || genericModelId;
  }

  protected loadProviderConfig(): AIServiceConfig {
    const provider = this.configService.get<string>('AI_PROVIDER', 'aws') as 'aws' | 'azure' | 'google' | 'openai';
    
    const baseConfig: AIServiceConfig = {
      provider,
      region: this.configService.get<string>('AI_REGION'),
      apiKey: this.configService.get<string>('AI_API_KEY'),
      endpoint: this.configService.get<string>('AI_ENDPOINT'),
      defaultModel: this.configService.get<string>('AI_DEFAULT_MODEL'),
      defaultMaxTokens: this.configService.get<number>('AI_DEFAULT_MAX_TOKENS'),
      defaultTemperature: this.configService.get<number>('AI_DEFAULT_TEMPERATURE')
    };

    // Load provider-specific model mappings
    try {
      const mappingsPath = path.join(process.cwd(), 'config', `${provider}-model-mappings.json`);
      if (fs.existsSync(mappingsPath)) {
        const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
        baseConfig.modelMappings = mappings;
        this.logger.log(`📋 Loaded model mappings for ${provider} provider`);
      }
    } catch (error) {
      this.logger.warn(`⚠️ Could not load model mappings for ${provider}: ${error.message}`);
    }

    return baseConfig;
  }

  protected generateRequestId(): string {
    return `${this.getProviderName()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected calculateProcessingTime(startTime: number): number {
    return Date.now() - startTime;
  }
}