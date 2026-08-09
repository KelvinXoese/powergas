import { Controller, Post, Get, Body, Param, Headers, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Initiate a payment' })
  async initiate(@Body() dto: InitiatePaymentDto, @CurrentUser() user: User) {
    return this.paymentsService.initiate(dto, user.email, user.phone);
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify a payment (server-side)' })
  async verify(@Param('reference') reference: string) {
    return this.paymentsService.verify(reference);
  }

  @Public()
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment provider webhook' })
  async webhook(
    @Param('provider') provider: string,
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
    @Req() req: Request,
  ) {
    const rawBody = JSON.stringify(body);
    await this.paymentsService.handleWebhook(provider, body, rawBody, signature);
    return { received: true };
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get payments for an order' })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }
}
