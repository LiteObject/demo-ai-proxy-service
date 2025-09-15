import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { BedrockService } from './services/bedrock.service';
import { AIServiceFactory } from './services/ai-service.factory';

@Module({
  controllers: [ProxyController],
  providers: [BedrockService, AIServiceFactory],
  exports: [AIServiceFactory],
})
export class ProxyModule {}
