import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { BedrockService } from './services/bedrock.service';

@Module({
  controllers: [ProxyController],
  providers: [BedrockService],
})
export class ProxyModule {}
