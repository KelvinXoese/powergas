import {
  IsEnum,
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType, DeliveryTier, PaymentMethod } from '../../common/enums';

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  cylinderTypeId: string;

  @ApiProperty()
  @IsString()
  cylinderTypeName: string;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

export class CreateOrderDto {
  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiPropertyOptional({ enum: DeliveryTier, default: DeliveryTier.STANDARD, description: 'STANDARD (cheaper, matched to nearest rider) or EXPRESS (dedicated rider, surcharge applies)' })
  @IsEnum(DeliveryTier)
  @IsOptional()
  deliveryTier?: DeliveryTier;

  @ApiProperty()
  @IsUUID()
  stationId: string;

  @ApiProperty()
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  deliveryLng?: number;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate orders' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
