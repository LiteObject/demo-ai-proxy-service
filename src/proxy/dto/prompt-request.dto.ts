import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PromptRequestDto {
  @ApiProperty({ 
    description: 'The prompt to send to the AI model',
    example: 'What is the capital of France?',
    maxLength: 10000
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  prompt: string;

  @ApiProperty({ 
    description: 'The ID of the Bedrock model to use',
    example: 'anthropic.claude-3-sonnet-20240229-v1:0',
    required: false
  })
  @IsString()
  @IsOptional()
  modelId?: string;

  @ApiProperty({ 
    description: 'Maximum number of tokens to generate',
    example: 1000,
    minimum: 1,
    maximum: 4096,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4096)
  maxTokens?: number;

  @ApiProperty({ 
    description: 'Controls randomness in the response (0.0 to 1.0)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;
}
