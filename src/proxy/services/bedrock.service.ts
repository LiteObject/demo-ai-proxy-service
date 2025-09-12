import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { PromptRequestDto } from '../dto/prompt-request.dto';
import { PromptResponse } from '../dto/prompt-response.dto';

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
}
