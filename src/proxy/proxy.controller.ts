import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { BedrockService } from './services/bedrock.service';
import { PromptRequestDto } from './dto/prompt-request.dto';
import { PromptResponse, PromptResponseDto } from './dto/prompt-response.dto';

@ApiTags('proxy')
@Controller('proxy')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly bedrockService: BedrockService) {}

  @Get()
  @ApiOperation({ summary: 'Get API information', description: 'Returns basic information about the API and available endpoints' })
  @ApiResponse({ status: 200, description: 'API information returned successfully' })
  getApiInfo() {
    return {
      service: 'AI Proxy Service',
      version: '1.0.0',
      description: 'Proxy service for AWS Bedrock AI models',
      endpoints: {
        'GET /api/proxy': 'This API documentation',
        'GET /api/proxy/health': 'Health check with endpoint list',
        'POST /api/proxy/health': 'Simple health check',
        'POST /api/proxy/prompt': 'Send prompt to Bedrock AI'
      },
      usage: {
        prompt: {
          method: 'POST',
          url: '/api/proxy/prompt',
          body: {
            prompt: 'Your question here',
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0 (optional)',
            maxTokens: 1000,
            temperature: 0.7
          }
        }
      }
    };
  }

  @Post('prompt')
  @ApiOperation({ summary: 'Send prompt to AI model', description: 'Forwards a prompt to AWS Bedrock and returns the AI response' })
  @ApiBody({ type: PromptRequestDto, description: 'Prompt request with optional parameters' })
  @ApiResponse({ status: 201, description: 'Prompt processed successfully', type: PromptResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendPrompt(@Body() request: PromptRequestDto): Promise<PromptResponse> {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      this.logger.log(`🚀 [${requestId}] Processing prompt request - Model: ${request.modelId || 'default'}`);
      this.logger.debug(`📝 [${requestId}] Prompt length: ${request.prompt.length} characters`);
      
      const response = await this.bedrockService.invokeModel(request);
      const duration = Date.now() - startTime;
      
      this.logger.log(`✅ [${requestId}] Prompt processed successfully in ${duration}ms - Response length: ${response.response.length} characters`);
      
      if (response.usage) {
        this.logger.debug(`📊 [${requestId}] Token usage - Input: ${response.usage.inputTokens}, Output: ${response.usage.outputTokens}`);
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ [${requestId}] Failed to process prompt request after ${duration}ms: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to process prompt',
          message: error.message,
          requestId,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check with endpoints', description: 'Returns service status and available endpoints' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheckGet(): Promise<{ status: string; timestamp: string; endpoints: string[] }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /api/proxy/health - This endpoint',
        'POST /api/proxy/health - Health check',
        'POST /api/proxy/prompt - Send prompt to Bedrock'
      ]
    };
  }

  @Post('health')
  @ApiOperation({ summary: 'Simple health check', description: 'Returns basic service status' })
  @ApiResponse({ status: 201, description: 'Service is healthy' })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
