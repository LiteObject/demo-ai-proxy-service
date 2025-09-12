import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyModule } from './proxy/proxy.module';
import { CustomLoggerService } from './common/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ProxyModule,
  ],
  providers: [CustomLoggerService],
  exports: [CustomLoggerService],
})
export class AppModule {}
