import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ description: 'Service status', example: 'ok' })
  status: string;

  @ApiProperty({ description: 'Timestamp of the health check', example: '2025-09-12T20:09:18.273Z' })
  timestamp: string;
}

export class DetailedHealthCheckResponseDto extends HealthCheckResponseDto {
  @ApiProperty({ description: 'List of available endpoints', type: [String] })
  endpoints: string[];
}