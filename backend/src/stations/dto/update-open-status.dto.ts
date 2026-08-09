import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOpenStatusDto {
  @ApiProperty({ description: 'true = open, false = closed' })
  @IsBoolean()
  isActive: boolean;
}
