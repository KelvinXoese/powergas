import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my customer profile' })
  async me(@CurrentUser() user: User) {
    return this.customersService.findByUserId(user.id);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get my saved addresses' })
  async getAddresses(@CurrentUser() user: User) {
    return this.customersService.getAddresses(user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a saved address' })
  async addAddress(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return this.customersService.addAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update an address' })
  async updateAddress(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateAddressDto>) {
    return this.customersService.updateAddress(user.id, id, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  async deleteAddress(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    await this.customersService.deleteAddress(user.id, id);
  }
}
