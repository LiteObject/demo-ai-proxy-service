import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber, Min, Max, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class IncidentReportFeedbackDto {
  @ApiProperty({ 
    description: 'The incident report content for analysis and feedback',
    example: 'On March 15th, an employee slipped on a wet floor in the warehouse. The employee was carrying boxes when they fell and injured their wrist. The floor was wet due to a leaking pipe that had not been reported.',
    maxLength: 50000
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  incidentReport: string;

  @ApiProperty({ 
    description: 'The ID of the Bedrock model to use for analysis',
    example: 'anthropic.claude-3-sonnet-20240229-v1:0',
    required: false
  })
  @IsString()
  @IsOptional()
  modelId?: string;

  @ApiProperty({ 
    description: 'Maximum number of tokens to generate for the feedback',
    example: 2000,
    minimum: 100,
    maximum: 4096,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(4096)
  maxTokens?: number;

  @ApiProperty({ 
    description: 'Controls randomness in the response (0.0 to 1.0). Lower values for more focused analysis.',
    example: 0.3,
    minimum: 0,
    maximum: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;
}