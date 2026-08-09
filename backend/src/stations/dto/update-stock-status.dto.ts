import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StockStatus } from '../../common/enums';

export class UpdateStockStatusDto {
  @ApiProperty({ enum: StockStatus })
  @IsEnum(StockStatus)
  stockStatus: StockStatus;
}
