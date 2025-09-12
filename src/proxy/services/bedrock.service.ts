import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { PromptRequestDto } from '../dto/prompt-request.dto';
import { PromptResponse } from '../dto/prompt-response.dto';
import { ProviderInfo, ModelInfo } from '../dto/providers-response.dto';

@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private readonly bedrockClient: BedrockRuntimeClient;
  private readonly defaultModelId: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.defaultModelId = this.configService.get<string>(
      'BEDROCK_MODEL_ID',
      'anthropic.claude-3-sonnet-20240229-v1:0',
    );
    this.defaultMaxTokens = this.configService.get<number>(
      'BEDROCK_MAX_TOKENS',
      1000,
    );
    this.defaultTemperature = this.configService.get<number>(
      'BEDROCK_TEMPERATURE',
      0.7,
    );

    const credentials: any = {
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    };

    // Add session token if available (for temporary credentials)
    const sessionToken = this.configService.get<string>('AWS_SESSION_TOKEN');
    if (sessionToken) {
      credentials.sessionToken = sessionToken;
    }

    this.bedrockClient = new BedrockRuntimeClient({
      region,
      credentials,
    });

    this.logger.log(`BedrockService initialized with region: ${region}`);
  }

  async invokeModel(request: PromptRequestDto): Promise<PromptResponse> {
    const modelId = request.modelId || this.defaultModelId;
    const startTime = Date.now();

    try {
      this.logger.log(`🤖 Invoking model: ${modelId}`);
      this.logger.debug(`📋 Request parameters - MaxTokens: ${request.maxTokens || this.defaultMaxTokens}, Temperature: ${request.temperature || this.defaultTemperature}`);

      // Prepare the request body based on the model family
      const requestBody = this.prepareRequestBody(request, modelId);
      this.logger.debug(`📤 Request body prepared for model family: ${this.getModelFamily(modelId)}`);

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      this.logger.debug(`⏳ Sending request to Bedrock...`);
      const response = await this.bedrockClient.send(command);
      const duration = Date.now() - startTime;
      
      this.logger.log(`📨 Received response from Bedrock in ${duration}ms`);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const parsedResponse = this.parseResponse(responseBody, modelId);
      
      this.logger.debug(`📊 Response parsed - Length: ${parsedResponse.response.length} characters`);
      
      return parsedResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Error invoking model ${modelId} after ${duration}ms: ${error.message}`, error.stack);
      throw new Error(`Failed to invoke model: ${error.message}`);
    }
  }

  private getModelFamily(modelId: string): string {
    if (modelId.includes('anthropic.claude')) return 'Claude';
    if (modelId.includes('amazon.titan')) return 'Titan';
    return 'Unknown';
  }

  private prepareRequestBody(request: PromptRequestDto, modelId: string): any {
    // Use environment defaults if not provided in request
    const maxTokens = request.maxTokens || this.defaultMaxTokens;
    const temperature = request.temperature || this.defaultTemperature;

    // Handle different model families
    if (modelId.includes('anthropic.claude')) {
      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      };
    } else if (modelId.includes('amazon.titan')) {
      return {
        inputText: request.prompt,
        textGenerationConfig: {
          maxTokenCount: maxTokens,
          temperature: temperature,
        },
      };
    } else {
      // Default format for other models
      return {
        prompt: request.prompt,
        max_tokens: maxTokens,
        temperature: temperature,
      };
    }
  }

  private parseResponse(responseBody: any, modelId: string): PromptResponse {
    let response: string;
    let usage: any;

    if (modelId.includes('anthropic.claude')) {
      response =
        responseBody.content?.[0]?.text || responseBody.completion || '';
      usage = responseBody.usage;
    } else if (modelId.includes('amazon.titan')) {
      response = responseBody.results?.[0]?.outputText || '';
      usage =
        responseBody.inputTextTokenCount &&
        responseBody.results?.[0]?.tokenCount
          ? {
              inputTokens: responseBody.inputTextTokenCount,
              outputTokens: responseBody.results[0].tokenCount,
            }
          : undefined;
    } else {
      // Default parsing
      response =
        responseBody.text ||
        responseBody.generated_text ||
        JSON.stringify(responseBody);
    }

    return {
      response,
      modelId,
      usage: usage
        ? {
            inputTokens: usage.input_tokens || usage.inputTokens || 0,
            outputTokens: usage.output_tokens || usage.outputTokens || 0,
          }
        : undefined,
    };
  }

  /**
   * Get all available AI providers and their models
   */
  getAvailableProviders(): ProviderInfo[] {
    this.logger.log('Retrieving available AI providers and models');

    const providers: ProviderInfo[] = [
      {
        name: 'Anthropic',
        description: 'Claude family of large language models',
        website: 'https://www.anthropic.com',
        models: [
          {
            id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
            name: 'Claude 3.5 Sonnet',
            description: 'Most intelligent model with balanced performance for complex tasks',
            maxTokens: 200000,
            supportsStreaming: true,
            inputCostPer1K: 0.003,
            outputCostPer1K: 0.015,
          },
          {
            id: 'anthropic.claude-3-sonnet-20240229-v1:0',
            name: 'Claude 3 Sonnet',
            description: 'Balanced model for a wide range of workloads',
            maxTokens: 200000,
            supportsStreaming: true,
            inputCostPer1K: 0.003,
            outputCostPer1K: 0.015,
          },
          {
            id: 'anthropic.claude-3-haiku-20240307-v1:0',
            name: 'Claude 3 Haiku',
            description: 'Fastest and most compact model for near-instant responsiveness',
            maxTokens: 200000,
            supportsStreaming: true,
            inputCostPer1K: 0.00025,
            outputCostPer1K: 0.00125,
          },
          {
            id: 'anthropic.claude-3-opus-20240229-v1:0',
            name: 'Claude 3 Opus',
            description: 'Most powerful model for highly complex tasks',
            maxTokens: 200000,
            supportsStreaming: true,
            inputCostPer1K: 0.015,
            outputCostPer1K: 0.075,
          },
          {
            id: 'anthropic.claude-v2:1',
            name: 'Claude 2.1',
            description: 'Previous generation Claude model',
            maxTokens: 100000,
            supportsStreaming: true,
            inputCostPer1K: 0.008,
            outputCostPer1K: 0.024,
          },
          {
            id: 'anthropic.claude-v2',
            name: 'Claude 2.0',
            description: 'Earlier Claude model version',
            maxTokens: 100000,
            supportsStreaming: true,
            inputCostPer1K: 0.008,
            outputCostPer1K: 0.024,
          },
        ],
      },
      {
        name: 'Amazon',
        description: 'Amazon Titan family of foundation models',
        website: 'https://aws.amazon.com/bedrock/titan/',
        models: [
          {
            id: 'amazon.titan-text-premier-v1:0',
            name: 'Titan Text Premier',
            description: 'High-performance text model for complex reasoning and content generation',
            maxTokens: 32000,
            supportsStreaming: true,
            inputCostPer1K: 0.0005,
            outputCostPer1K: 0.0015,
          },
          {
            id: 'amazon.titan-text-express-v1',
            name: 'Titan Text Express',
            description: 'Fast and cost-effective text model for general tasks',
            maxTokens: 8000,
            supportsStreaming: true,
            inputCostPer1K: 0.0002,
            outputCostPer1K: 0.0006,
          },
          {
            id: 'amazon.titan-text-lite-v1',
            name: 'Titan Text Lite',
            description: 'Lightweight text model for simple tasks',
            maxTokens: 4000,
            supportsStreaming: false,
            inputCostPer1K: 0.0001,
            outputCostPer1K: 0.0003,
          },
          {
            id: 'amazon.titan-embed-text-v1',
            name: 'Titan Embeddings',
            description: 'Text embeddings model for semantic search and RAG',
            maxTokens: 8000,
            supportsStreaming: false,
            inputCostPer1K: 0.0001,
          },
        ],
      },
      {
        name: 'AI21 Labs',
        description: 'Jurassic family of language models',
        website: 'https://www.ai21.com',
        models: [
          {
            id: 'ai21.j2-ultra-v1',
            name: 'Jurassic-2 Ultra',
            description: 'Large-scale language model for complex text generation',
            maxTokens: 8192,
            supportsStreaming: false,
            inputCostPer1K: 0.0188,
            outputCostPer1K: 0.0188,
          },
          {
            id: 'ai21.j2-mid-v1',
            name: 'Jurassic-2 Mid',
            description: 'Balanced performance and cost language model',
            maxTokens: 8192,
            supportsStreaming: false,
            inputCostPer1K: 0.0125,
            outputCostPer1K: 0.0125,
          },
        ],
      },
      {
        name: 'Cohere',
        description: 'Command family of models for text generation and embeddings',
        website: 'https://cohere.com',
        models: [
          {
            id: 'cohere.command-text-v14',
            name: 'Command',
            description: 'Generative model for business applications',
            maxTokens: 4000,
            supportsStreaming: false,
            inputCostPer1K: 0.0015,
            outputCostPer1K: 0.002,
          },
          {
            id: 'cohere.command-light-text-v14',
            name: 'Command Light',
            description: 'Faster, lighter version of Command',
            maxTokens: 4000,
            supportsStreaming: false,
            inputCostPer1K: 0.0003,
            outputCostPer1K: 0.0006,
          },
          {
            id: 'cohere.embed-english-v3',
            name: 'Embed English',
            description: 'English text embeddings model',
            maxTokens: 512,
            supportsStreaming: false,
            inputCostPer1K: 0.0001,
          },
          {
            id: 'cohere.embed-multilingual-v3',
            name: 'Embed Multilingual',
            description: 'Multilingual text embeddings model',
            maxTokens: 512,
            supportsStreaming: false,
            inputCostPer1K: 0.0001,
          },
        ],
      },
      {
        name: 'Meta',
        description: 'Llama family of open-source language models',
        website: 'https://llama.meta.com',
        models: [
          {
            id: 'meta.llama2-70b-chat-v1',
            name: 'Llama 2 70B Chat',
            description: 'Large chat-optimized model with 70 billion parameters',
            maxTokens: 4096,
            supportsStreaming: true,
            inputCostPer1K: 0.00195,
            outputCostPer1K: 0.00256,
          },
          {
            id: 'meta.llama2-13b-chat-v1',
            name: 'Llama 2 13B Chat',
            description: 'Medium-sized chat model with 13 billion parameters',
            maxTokens: 4096,
            supportsStreaming: true,
            inputCostPer1K: 0.00075,
            outputCostPer1K: 0.001,
          },
          {
            id: 'meta.llama2-7b-chat-v1',
            name: 'Llama 2 7B Chat',
            description: 'Compact chat model with 7 billion parameters',
            maxTokens: 4096,
            supportsStreaming: true,
            inputCostPer1K: 0.0003,
            outputCostPer1K: 0.0004,
          },
        ],
      },
      {
        name: 'Mistral AI',
        description: 'Efficient and performant language models',
        website: 'https://mistral.ai',
        models: [
          {
            id: 'mistral.mistral-7b-instruct-v0:2',
            name: 'Mistral 7B Instruct',
            description: 'Instruction-following model optimized for conversations',
            maxTokens: 32000,
            supportsStreaming: true,
            inputCostPer1K: 0.00015,
            outputCostPer1K: 0.0002,
          },
          {
            id: 'mistral.mixtral-8x7b-instruct-v0:1',
            name: 'Mixtral 8x7B Instruct',
            description: 'Mixture of experts model with strong performance',
            maxTokens: 32000,
            supportsStreaming: true,
            inputCostPer1K: 0.00045,
            outputCostPer1K: 0.0007,
          },
        ],
      },
    ];

    this.logger.log(`Retrieved ${providers.length} providers with ${providers.reduce((total, provider) => total + provider.models.length, 0)} total models`);
    return providers;
  }

  /**
   * Get the default model configuration
   */
  getDefaultModelConfig() {
    return {
      modelId: this.defaultModelId,
      maxTokens: this.defaultMaxTokens,
      temperature: this.defaultTemperature,
    };
  }
}
