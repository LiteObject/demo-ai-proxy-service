import { HttpException, HttpStatus } from '@nestjs/common';

export class BedrockInvocationException extends HttpException {
  constructor(
    public readonly modelId: string,
    message: string,
    public readonly meta?: Record<string, any>,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        message: `Bedrock invocation failed for model ${modelId}: ${message}`,
        modelId,
        statusCode,
        meta,
      },
      statusCode,
    );
  }
}

export class BedrockConfigurationException extends HttpException {
  constructor(message: string, public readonly configKey?: string) {
    super(
      {
        message: `Bedrock configuration error: ${message}`,
        configKey,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}