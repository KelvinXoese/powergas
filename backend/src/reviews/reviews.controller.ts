import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('reviews')
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit a review' })
  async create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Public()
  @Get('station/:stationId')
  @ApiOperation({ summary: 'Get station reviews' })
  async getForStation(@Param('stationId', ParseUUIDPipe) stationId: string) {
    return this.reviewsService.getForStation(stationId);
  }

  @Public()
  @Get('rider/:riderId')
  @ApiOperation({ summary: 'Get rider reviews' })
  async getForRider(@Param('riderId', ParseUUIDPipe) riderId: string) {
    return this.reviewsService.getForRider(riderId);
  }
}
