import { Controller, Post, Get, Param, UseGuards, UseInterceptors, UploadedFile as FileParam, Body, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FilePurpose } from '../common/enums';

@ApiTags('files')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  async upload(
    @CurrentUser() user: User,
    @FileParam() file: Express.Multer.File,
    @Body('purpose') purpose: FilePurpose,
    @Body('relatedId') relatedId?: string,
  ) {
    return this.filesService.upload(user.id, file, purpose, relatedId);
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get a signed URL for a file' })
  async getSignedUrl(@Param('id', ParseUUIDPipe) id: string) {
    return { url: await this.filesService.getSignedUrl(id) };
  }
}
