import { ApiProperty } from '@nestjs/swagger';

export class PromptResponseDto {
  @ApiProperty({ description: 'The AI-generated response to the prompt' })
  response: string;

  @ApiProperty({ description: 'The ID of the model that generated the response' })
  modelId: string;

  @ApiProperty({ 
    description: 'Token usage information', 
    required: false,
    type: 'object',
    properties: {
      inputTokens: { type: 'number' },
      outputTokens: { type: 'number' }
    }
  })
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Keep the interface for backwards compatibility
export interface PromptResponse {
  response: string;
  modelId: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
