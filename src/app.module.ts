import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyModule } from './proxy/proxy.module';
import * as Joi from 'joi';
import { CustomLoggerService } from './common/logger.service';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        AWS_REGION: Joi.string().default('us-east-1'),
        AWS_ACCESS_KEY_ID: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_SESSION_TOKEN: Joi.string().optional(),
        BEDROCK_MODEL_ID: Joi.string().default('anthropic.claude-3-sonnet-20240229-v1:0'),
        BEDROCK_MAX_TOKENS: Joi.number().integer().min(1).max(200000).default(1000),
        BEDROCK_TEMPERATURE: Joi.number().min(0).max(1).default(0.7),
        LOG_LEVEL: Joi.string().valid('ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE').default('INFO'),
        PORT: Joi.number().integer().min(1).max(65535).default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    ProxyModule,
  ],
  providers: [CustomLoggerService],
  exports: [CustomLoggerService],
})
export class AppModule {}
