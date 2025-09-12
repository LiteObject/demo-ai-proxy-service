import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger.service';
import { LoggingInterceptor } from './common/logging.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Set up custom logger
  const logger = app.get(CustomLoggerService);
  app.useLogger(logger);

  // Security middleware
  app.use(helmet());

  // Enable global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable CORS for cross-origin requests
  app.enableCors();

  // Enable global validation pipes with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api');

  // Setup Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('AI Proxy Service')
    .setDescription('A proxy service that forwards prompts to AWS Bedrock AI models')
    .setVersion('1.0')
    .addTag('proxy', 'AI proxy endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application started successfully!`);
  logger.log(`🌐 Server running on: http://localhost:${port}`);
  logger.log(`📚 API documentation: http://localhost:${port}/api/docs`);
  logger.log(`🔍 API endpoints: http://localhost:${port}/api/proxy`);
  logger.log(`📊 Log level: ${process.env.LOG_LEVEL || 'INFO'}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log environment configuration (without sensitive data)
  const region = process.env.AWS_REGION || 'us-east-1';
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
  logger.log(`🔧 AWS Region: ${region}`);
  logger.log(`🤖 Default Model: ${modelId}`);
}

bootstrap();
