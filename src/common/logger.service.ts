import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private enabledLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

  constructor(private configService: ConfigService) {
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'INFO').toUpperCase();
    this.configureLogLevels(logLevel);
  }

  private configureLogLevels(level: string) {
    const levelMap: Record<string, LogLevel[]> = {
      ERROR: ['error'],
      WARN: ['error', 'warn'],
      INFO: ['error', 'warn', 'log'],
      DEBUG: ['error', 'warn', 'log', 'debug'],
      VERBOSE: ['error', 'warn', 'log', 'debug', 'verbose'],
    };
    
    this.enabledLevels = levelMap[level] || levelMap.INFO;
  }

  setLogLevels(levels: LogLevel[]) {
    this.enabledLevels = levels;
  }

  private formatMessage(level: string, message: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}]` : '';
    return `${timestamp} [${level.toUpperCase()}] ${ctx} ${message}`;
  }

  log(message: any, context?: string) {
    if (this.enabledLevels.includes('log')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (this.enabledLevels.includes('error')) {
      console.error(this.formatMessage('error', message, context));
      if (trace) {
        console.error('Trace:', trace);
      }
    }
  }

  warn(message: any, context?: string) {
    if (this.enabledLevels.includes('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  debug(message: any, context?: string) {
    if (this.enabledLevels.includes('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  verbose(message: any, context?: string) {
    if (this.enabledLevels.includes('verbose')) {
      console.log(this.formatMessage('verbose', message, context));
    }
  }
}