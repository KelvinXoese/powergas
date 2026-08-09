import { IsUUID, IsEnum, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeType } from '../../common/enums';

export class CreateDisputeDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: DisputeType })
  @IsEnum(DisputeType)
  type: DisputeType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  evidenceUrls?: string[];
}
