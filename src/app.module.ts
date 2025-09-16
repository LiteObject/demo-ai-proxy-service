import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyModule } from './proxy/proxy.module';
import { validateConfiguration } from './common/config.schema';
import { CustomLoggerService } from './common/logger.service';
import { EnhancedLoggerService } from './common/enhanced-logger.service';
import { RetryService } from './common/retry.service';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateConfiguration(),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    ProxyModule,
  ],
  providers: [
    CustomLoggerService,
    EnhancedLoggerService,
    RetryService
  ],
  exports: [
    CustomLoggerService,
    EnhancedLoggerService,
    RetryService
  ],
})
export class AppModule {}
