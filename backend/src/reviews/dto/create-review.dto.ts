import { IsUUID, IsInt, Min, Max, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  stationId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  riderId?: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}
