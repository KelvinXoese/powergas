import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPricingDto {
  @ApiProperty()
  @IsUUID()
  cylinderTypeId: string;

  @ApiProperty({ description: 'Price for cylinder exchange' })
  @IsNumber()
  @Min(0)
  exchangePrice: number;

  @ApiProperty({ description: 'Price for a brand-new cylinder + gas' })
  @IsNumber()
  @Min(0)
  newPrice: number;

  @ApiProperty({ description: 'Price for a refill' })
  @IsNumber()
  @Min(0)
  refillPrice: number;

  @ApiProperty({ description: 'Extra charge applied to emergency orders' })
  @IsNumber()
  @Min(0)
  emergencySurcharge: number;
}
