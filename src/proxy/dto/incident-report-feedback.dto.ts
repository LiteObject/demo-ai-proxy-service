import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IncidentReportFeedbackDto {
  @ApiProperty({ 
    description: 'The incident report content for expert safety analysis and feedback',
    example: 'On March 15th, an employee slipped on a wet floor in the warehouse. The employee was carrying boxes when they fell and injured their wrist. The floor was wet due to a leaking pipe that had not been reported.',
    maxLength: 50000
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000, { message: 'Incident report must not exceed 50,000 characters' })
  incidentReport: string;
}