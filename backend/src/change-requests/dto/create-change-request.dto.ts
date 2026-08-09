import { IsString, IsUUID, IsNumber, IsPositive, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChangeRequestDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  description: string;

  @ApiProperty({ description: 'URL of the uploaded photo evidence — required' })
  @IsString()
  photoUrl: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  additionalAmount: number;
}
