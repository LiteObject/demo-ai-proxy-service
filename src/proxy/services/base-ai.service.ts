import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIServiceInterface, AIServiceConfig } from '../interfaces/ai-service.interface';
import { PromptRequestDto } from '../dto/prompt-request.dto';
import { PromptResponse } from '../dto/prompt-response.dto';
import { ProviderInfo } from '../dto/providers-response.dto';
import { ProviderName } from '../types/provider.types';
import { SystemPromptLoader } from './system-prompt-loader.service';
import { RetryService, RetryConditions } from '../../common/retry.service';
import { EnhancedLoggerService } from '../../common/enhanced-logger.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export abstract class BaseAIService implements AIServiceInterface {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly config: AIServiceConfig;

  constructor(
    protected configService: ConfigService,
    protected systemPromptLoader: SystemPromptLoader,
    protected retryService?: RetryService,
    protected enhancedLogger?: EnhancedLoggerService
  ) {
    this.config = this.loadProviderConfig();
  }

  // Abstract methods that must be implemented by concrete services
  abstract invokeModel(request: PromptRequestDto): Promise<PromptResponse>;
  abstract getAvailableProviders(): ProviderInfo[];
  abstract getProviderName(): ProviderName;
  abstract healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;

  // Common implementation for incident report processing
  async processIncidentReportFeedback(incidentReport: string): Promise<PromptResponse> {
    const requestId = this.generateRequestId();
    const performanceTracker = this.enhancedLogger?.startOperation('incident-report-analysis', {
      requestId,
      reportLength: incidentReport.length,
      provider: this.getProviderName()
    });
    
    try {
      this.logger.log(`📄 [${requestId}] Processing incident report feedback request`);
      
      // Load system prompt asynchronously with caching
      const systemPrompt = await this.systemPromptLoader.getIncidentPrompt();
      
      this.logger.debug(`📋 [${requestId}] System prompt loaded`);
      this.logger.debug(`📝 [${requestId}] Incident report length: ${incidentReport.length} characters`);

      // Combine system prompt with user incident report
      const combinedPrompt = `${systemPrompt}\n\n## Incident Report to Analyze:\n\n${incidentReport}`;

      // Get configuration optimized for safety analysis
      const analysisConfig = this.getIncidentAnalysisConfig();
      
      // Create a prompt request with the combined content and predefined settings
      const promptRequest: PromptRequestDto = {
        prompt: combinedPrompt,
        modelId: analysisConfig.modelId,
        maxTokens: analysisConfig.maxTokens,
        temperature: analysisConfig.temperature
      };

      this.logger.log(`🔍 [${requestId}] Invoking expert analysis with optimized settings for ${this.getProviderName()}`);
      this.logger.debug(`🔧 [${requestId}] Config: model=${analysisConfig.modelId}, temp=${analysisConfig.temperature}, maxTokens=${analysisConfig.maxTokens}`);
      
      // Use retry service if available, otherwise call directly
      const response = await this.executeWithRetry(
        () => this.invokeModel(promptRequest),
        requestId
      );
      
      performanceTracker?.success({
        modelId: analysisConfig.modelId,
        responseLength: response.response.length
      });
      
      this.logger.log(`✅ [${requestId}] Incident report analysis completed in ${performanceTracker?.getElapsedTime() || 'unknown'}ms`);
      
      return response;
      
    } catch (error: any) {
      performanceTracker?.failure(error, {
        errorType: error.name,
        errorMessage: error.message
      });
      
      this.logger.error(`❌ [${requestId}] Error processing incident report feedback: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Configuration method for incident analysis - can be overridden by providers
  protected getIncidentAnalysisConfig(): { modelId: string; maxTokens: number; temperature: number } {
    return {
      modelId: this.configService.get<string>('INCIDENT_REPORT_MODEL_ID', this.getDefaultModelConfig().modelId),
      maxTokens: this.configService.get<number>('INCIDENT_REPORT_MAX_TOKENS', 2000),
      temperature: this.configService.get<number>('INCIDENT_REPORT_TEMPERATURE', 0.3)
    };
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

  /**
   * Execute operation with retry logic if retry service is available
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>, 
    requestId: string
  ): Promise<T> {
    if (!this.retryService) {
      // Fallback to direct execution if retry service not available
      return await operation();
    }

    const result = await this.retryService.executeWithRetry(
      operation,
      RetryConditions.default,
      {
        maxRetries: this.configService.get<number>('bedrock.maxRetries', 3),
        baseDelayMs: this.configService.get<number>('app.retryDelayMs', 1000),
        maxDelayMs: 30000,
        backoffMultiplier: this.configService.get<number>('app.retryBackoffMultiplier', 2),
        jitterEnabled: true
      }
    );

    if (!result.success) {
      this.logger.error(`❌ [${requestId}] Operation failed after ${result.attempts} attempts: ${result.error?.message}`);
      throw result.error;
    }

    if (result.attempts > 1) {
      this.logger.log(`🔄 [${requestId}] Operation succeeded after ${result.attempts} attempts in ${result.totalElapsedMs}ms`);
    }

    return result.result!;
  }
}