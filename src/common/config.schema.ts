import { Type } from 'class-transformer';
import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsOptional, 
  Min, 
  Max, 
  IsBoolean,
  ValidateNested,
  IsPositive
} from 'class-validator';

/**
 * AWS Bedrock Configuration Schema
 */
export class BedrockConfigSchema {
  @IsString()
  @IsOptional()
  region?: string = 'us-east-1';

  @IsString()
  @IsOptional()
  modelId?: string = 'anthropic.claude-3-sonnet-20240229-v1:0';

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Min(1)
  @Max(4096)
  maxTokens?: number = 1000;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  temperature?: number = 0.7;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(1000)
  timeoutMs?: number = 30000;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  maxRetries?: number = 3;
}

/**
 * Incident Analysis Configuration Schema
 */
export class IncidentAnalysisConfigSchema {
  @IsString()
  @IsOptional()
  modelId?: string = 'anthropic.claude-3-sonnet-20240229-v1:0';

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(500)
  @Max(4096)
  maxTokens?: number = 2000;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  temperature?: number = 0.3;

  @IsString()
  @IsOptional()
  systemPromptPath?: string = 'config/incident-report-system-prompt.md';
}

/**
 * Logging Configuration Schema
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

export class LoggingConfigSchema {
  @IsEnum(LogLevel)
  @IsOptional()
  level?: LogLevel = LogLevel.INFO;

  @IsBoolean()
  @IsOptional()
  enableStructuredLogging?: boolean = true;

  @IsBoolean()
  @IsOptional()
  enableMetrics?: boolean = false;

  @IsBoolean()
  @IsOptional()
  enableTracing?: boolean = false;
}

/**
 * Application Configuration Schema
 */
export enum NodeEnvironment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test'
}

export class ApplicationConfigSchema {
  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(1000)
  @Max(65535)
  port?: number = 3000;

  @IsEnum(NodeEnvironment)
  @IsOptional()
  nodeEnv?: NodeEnvironment = NodeEnvironment.DEVELOPMENT;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(1000)
  globalTimeoutMs?: number = 30000;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  globalMaxRetries?: number = 3;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(100)
  retryDelayMs?: number = 1000;

  @IsNumber()
  @IsOptional()
  @Min(1.1)
  @Max(5)
  retryBackoffMultiplier?: number = 2;
}

/**
 * Root Configuration Schema
 */
export class ConfigurationSchema {
  @ValidateNested()
  @Type(() => ApplicationConfigSchema)
  app: ApplicationConfigSchema = new ApplicationConfigSchema();

  @ValidateNested()
  @Type(() => BedrockConfigSchema)
  bedrock: BedrockConfigSchema = new BedrockConfigSchema();

  @ValidateNested()
  @Type(() => IncidentAnalysisConfigSchema)
  incidentAnalysis: IncidentAnalysisConfigSchema = new IncidentAnalysisConfigSchema();

  @ValidateNested()
  @Type(() => LoggingConfigSchema)
  logging: LoggingConfigSchema = new LoggingConfigSchema();
}

/**
 * Configuration validation function
 */
export function validateConfiguration() {
  return (config: Record<string, unknown>) => {
    const validatedConfig = new ConfigurationSchema();
    
    // Map environment variables to configuration schema
    validatedConfig.app.port = config.PORT ? parseInt(config.PORT as string, 10) : 3000;
    validatedConfig.app.nodeEnv = (config.NODE_ENV as NodeEnvironment) || NodeEnvironment.DEVELOPMENT;
    validatedConfig.app.globalTimeoutMs = config.GLOBAL_TIMEOUT_MS ? parseInt(config.GLOBAL_TIMEOUT_MS as string, 10) : 30000;
    validatedConfig.app.globalMaxRetries = config.GLOBAL_MAX_RETRIES ? parseInt(config.GLOBAL_MAX_RETRIES as string, 10) : 3;
    validatedConfig.app.retryDelayMs = config.RETRY_DELAY_MS ? parseInt(config.RETRY_DELAY_MS as string, 10) : 1000;
    validatedConfig.app.retryBackoffMultiplier = config.RETRY_BACKOFF_MULTIPLIER ? parseFloat(config.RETRY_BACKOFF_MULTIPLIER as string) : 2;

    validatedConfig.bedrock.region = (config.AWS_REGION as string) || 'us-east-1';
    validatedConfig.bedrock.modelId = (config.BEDROCK_MODEL_ID as string) || 'anthropic.claude-3-sonnet-20240229-v1:0';
    validatedConfig.bedrock.maxTokens = config.BEDROCK_MAX_TOKENS ? parseInt(config.BEDROCK_MAX_TOKENS as string, 10) : 1000;
    validatedConfig.bedrock.temperature = config.BEDROCK_TEMPERATURE ? parseFloat(config.BEDROCK_TEMPERATURE as string) : 0.7;
    validatedConfig.bedrock.timeoutMs = config.BEDROCK_TIMEOUT_MS ? parseInt(config.BEDROCK_TIMEOUT_MS as string, 10) : 30000;
    validatedConfig.bedrock.maxRetries = config.BEDROCK_MAX_RETRIES ? parseInt(config.BEDROCK_MAX_RETRIES as string, 10) : 3;

    validatedConfig.incidentAnalysis.modelId = (config.INCIDENT_ANALYSIS_MODEL_ID as string) || 'anthropic.claude-3-sonnet-20240229-v1:0';
    validatedConfig.incidentAnalysis.maxTokens = config.INCIDENT_ANALYSIS_MAX_TOKENS ? parseInt(config.INCIDENT_ANALYSIS_MAX_TOKENS as string, 10) : 2000;
    validatedConfig.incidentAnalysis.temperature = config.INCIDENT_ANALYSIS_TEMPERATURE ? parseFloat(config.INCIDENT_ANALYSIS_TEMPERATURE as string) : 0.3;
    validatedConfig.incidentAnalysis.systemPromptPath = (config.INCIDENT_ANALYSIS_SYSTEM_PROMPT_PATH as string) || 'config/incident-report-system-prompt.md';

    validatedConfig.logging.level = (config.LOG_LEVEL as LogLevel) || LogLevel.INFO;
    validatedConfig.logging.enableStructuredLogging = config.ENABLE_STRUCTURED_LOGGING === 'true';
    validatedConfig.logging.enableMetrics = config.ENABLE_METRICS === 'true';
    validatedConfig.logging.enableTracing = config.ENABLE_TRACING === 'true';

    return validatedConfig;
  };
}