import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AIServiceFactory } from './services/ai-service.factory';
import { AIServiceInterface } from './interfaces/ai-service.interface';
import { PromptRequestDto } from './dto/prompt-request.dto';
import { PromptResponse, PromptResponseDto } from './dto/prompt-response.dto';
import { ProvidersResponseDto } from './dto/providers-response.dto';
import { IncidentReportFeedbackDto } from './dto/incident-report-feedback.dto';
import { BedrockInvocationException } from './exceptions/bedrock.exceptions';
import { randomUUID } from 'crypto';
import { HealthCheckResponseDto, DetailedHealthCheckResponseDto } from './dto/health-response.dto';

@ApiTags('proxy')
@Controller('proxy')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  private aiService: AIServiceInterface | null = null;

  constructor(private readonly aiServiceFactory: AIServiceFactory) {}

  private async getAIService(): Promise<AIServiceInterface> {
    if (!this.aiService) {
      this.aiService = await this.aiServiceFactory.createService();
    }
    return this.aiService;
  }

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
        'GET /api/proxy/providers': 'Get all LLM providers and available models',
        'GET /api/proxy/health': 'Health check with endpoint list',
        'POST /api/proxy/health': 'Simple health check',
        'POST /api/proxy/prompt': 'Send prompt to Bedrock AI',
        'POST /api/proxy/incident-report-feedback': 'Analyze incident reports with expert safety feedback'
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

  @Get('providers')
  @ApiOperation({ 
    summary: 'Get all LLM providers and models', 
    description: 'Returns a comprehensive list of all available AI providers and their models with pricing information' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Providers and models list returned successfully',
    type: ProvidersResponseDto
  })
  async getProviders(): Promise<ProvidersResponseDto> {
    try {
      this.logger.log('🔍 Retrieving all available AI providers and models');
      
      const aiService = await this.getAIService();
      const providers = aiService.getAvailableProviders();
      const defaultConfig = aiService.getDefaultModelConfig();
      const totalModels = providers.reduce((total, provider) => total + provider.models.length, 0);
      
      this.logger.log(`✅ Retrieved ${providers.length} providers with ${totalModels} total models`);
      
      return {
        providers,
        totalModels,
        defaultModel: defaultConfig.modelId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to retrieve providers: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to retrieve providers',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('prompt')
  @ApiOperation({ summary: 'Send prompt to AI model', description: 'Forwards a prompt to AWS Bedrock and returns the AI response' })
  @ApiBody({ type: PromptRequestDto, description: 'Prompt request with optional parameters' })
  @ApiResponse({ status: 201, description: 'Prompt processed successfully', type: PromptResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendPrompt(@Body() request: PromptRequestDto): Promise<PromptResponse> {
    const startTime = Date.now();
    const requestId = randomUUID();
    
    try {
      this.logger.log(`🚀 [${requestId}] Processing prompt request - Model: ${request.modelId || 'default'}`);
      this.logger.debug(`📝 [${requestId}] Prompt length: ${request.prompt.length} characters`);
      
      const aiService = await this.getAIService();
      const response = await aiService.invokeModel(request);
      const duration = Date.now() - startTime;
      
      this.logger.log(`✅ [${requestId}] Prompt processed successfully in ${duration}ms - Response length: ${response.response.length} characters`);
      
      if (response.usage) {
        this.logger.debug(`📊 [${requestId}] Token usage - Input: ${response.usage.inputTokens}, Output: ${response.usage.outputTokens}`);
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BedrockInvocationException) {
        this.logger.error(`❌ [${requestId}] Bedrock invocation failed after ${duration}ms: ${error.message}`, error.stack);
        throw new HttpException(
          {
            status: HttpStatus.BAD_GATEWAY,
            error: 'Bedrock service unavailable',
            message: 'The AI service is currently unavailable. Please try again later.',
            requestId,
            meta: error.meta,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
      
      this.logger.error(`❌ [${requestId}] Failed to process prompt request after ${duration}ms: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to process prompt',
          message: 'An unexpected error occurred while processing your request.',
          requestId,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('incident-report-feedback')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Analyze incident reports with expert safety feedback', 
    description: 'Accepts workplace incident reports and provides expert safety analysis using predefined system prompts and optimized AI model settings for safety analysis' 
  })
  @ApiBody({ 
    type: IncidentReportFeedbackDto, 
    description: 'Incident report details for expert safety analysis' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Incident report analyzed successfully with expert safety feedback', 
    type: PromptResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid incident report data' })
  @ApiResponse({ status: 500, description: 'Internal server error during analysis' })
  async processIncidentReportFeedback(@Body() body: IncidentReportFeedbackDto): Promise<PromptResponseDto> {
    const requestId = randomUUID();
    
    try {
      this.logger.log(`🚨 [${requestId}] Processing incident report feedback request`);
      this.logger.debug(`📝 [${requestId}] Incident report length: ${body.incidentReport.length} characters`);
      this.logger.debug(`🔧 [${requestId}] Using predefined safety analysis configuration`);

      const aiService = await this.getAIService();
      const response: PromptResponse = await aiService.processIncidentReportFeedback(
        body.incidentReport
      );

      this.logger.log(`✅ [${requestId}] Incident report analysis completed successfully`);
      this.logger.debug(`📊 [${requestId}] Response length: ${response.response.length} characters`);

      return {
        response: response.response,
        modelId: response.modelId,
        usage: response.usage,
      };
    } catch (error) {
      this.logger.error(`❌ [${requestId}] Failed to process incident report: ${error.message}`, error.stack);
      
      if (error instanceof BedrockInvocationException) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_GATEWAY,
            error: 'Bedrock Service Error',
            message: error.message,
            details: error.meta,
            requestId,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'Failed to process incident report feedback',
          requestId,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check with endpoints', description: 'Returns service status and available endpoints' })
  @ApiResponse({ status: 200, description: 'Service is healthy', type: DetailedHealthCheckResponseDto })
  async healthCheckGet(): Promise<DetailedHealthCheckResponseDto> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /api/proxy/health - This endpoint',
        'GET /api/proxy/providers - Get all LLM providers and models',
        'POST /api/proxy/health - Health check',
        'POST /api/proxy/prompt - Send prompt to Bedrock',
        'POST /api/proxy/incident-report-feedback - Analyze incident reports with expert safety feedback'
      ]
    };
  }

  @Post('health')
  @HttpCode(200)
  @ApiOperation({ summary: 'Simple health check', description: 'Returns basic service status' })
  @ApiResponse({ status: 200, description: 'Service is healthy', type: HealthCheckResponseDto })
  async healthCheck(): Promise<HealthCheckResponseDto> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
