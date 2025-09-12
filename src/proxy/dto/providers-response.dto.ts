import { ApiProperty } from '@nestjs/swagger';

export class ModelInfo {
  @ApiProperty({ description: 'Unique identifier for the model' })
  id: string;

  @ApiProperty({ description: 'Human-readable name of the model' })
  name: string;

  @ApiProperty({ description: 'Description of the model capabilities' })
  description: string;

  @ApiProperty({ description: 'Maximum tokens supported by the model' })
  maxTokens: number;

  @ApiProperty({ description: 'Whether the model supports streaming responses' })
  supportsStreaming: boolean;

  @ApiProperty({ description: 'Input cost per 1K tokens in USD', required: false })
  inputCostPer1K?: number;

  @ApiProperty({ description: 'Output cost per 1K tokens in USD', required: false })
  outputCostPer1K?: number;
}

export class ProviderInfo {
  @ApiProperty({ description: 'Name of the AI provider' })
  name: string;

  @ApiProperty({ description: 'Description of the provider' })
  description: string;

  @ApiProperty({ description: 'Website URL of the provider' })
  website: string;

  @ApiProperty({ description: 'List of available models', type: [ModelInfo] })
  models: ModelInfo[];
}

export class ProvidersResponseDto {
  @ApiProperty({ description: 'List of available AI providers', type: [ProviderInfo] })
  providers: ProviderInfo[];

  @ApiProperty({ description: 'Total number of available models' })
  totalModels: number;

  @ApiProperty({ description: 'Default model ID used by the service' })
  defaultModel: string;

  @ApiProperty({ description: 'Timestamp when the data was retrieved' })
  timestamp: string;
}