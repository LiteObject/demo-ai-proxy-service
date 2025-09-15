import { PromptRequestDto } from '../dto/prompt-request.dto';
import { PromptResponse } from '../dto/prompt-response.dto';
import { ProviderInfo } from '../dto/providers-response.dto';

export interface AIServiceInterface {
  /**
   * Invoke an AI model with the given prompt request
   */
  invokeModel(request: PromptRequestDto): Promise<PromptResponse>;

  /**
   * Process incident report with specialized safety analysis
   */
  processIncidentReportFeedback(incidentReport: string): Promise<PromptResponse>;

  /**
   * Get all available AI providers and their models
   */
  getAvailableProviders(): ProviderInfo[];

  /**
   * Get the default model configuration for this provider
   */
  getDefaultModelConfig(): { modelId: string; maxTokens: number; temperature: number };

  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Health check for the AI service
   */
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;
}

export interface AIServiceConfig {
  provider: 'aws' | 'azure' | 'google' | 'openai';
  region?: string;
  apiKey?: string;
  endpoint?: string;
  modelMappings?: Record<string, string>;
  defaultModel?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

export interface ModelMapping {
  [genericModelId: string]: string; // Maps generic ID to provider-specific ID
}

export interface AIServiceMetadata {
  provider: string;
  version: string;
  capabilities: string[];
  supportedFeatures: {
    streaming: boolean;
    functionCalling: boolean;
    imageInput: boolean;
    customInstructions: boolean;
  };
}

export interface AIServiceProvider {
  name: string;
  displayName: string;
  region?: string;
  capabilities: AIServiceCapabilities;
}

export interface AIServiceCapabilities {
  textGeneration: boolean;
  chatCompletion: boolean;
  imageGeneration: boolean;
  embeddingGeneration: boolean;
  functionCalling: boolean;
}