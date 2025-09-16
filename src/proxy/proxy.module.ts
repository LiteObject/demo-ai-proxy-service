import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { BedrockService } from './services/bedrock.service';
import { AIServiceFactory } from './services/ai-service.factory';
import { SystemPromptLoader } from './services/system-prompt-loader.service';
import { RetryService } from '../common/retry.service';
import { EnhancedLoggerService } from '../common/enhanced-logger.service';

@Module({
  controllers: [ProxyController],
  providers: [
    BedrockService, 
    AIServiceFactory, 
    SystemPromptLoader,
    RetryService,
    EnhancedLoggerService
  ],
  exports: [AIServiceFactory],
})
export class ProxyModule {}
