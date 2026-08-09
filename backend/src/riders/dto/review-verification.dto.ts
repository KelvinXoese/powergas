import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewVerificationDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'] })
  @IsIn(['VERIFIED', 'REJECTED'])
  status: 'VERIFIED' | 'REJECTED';
}
