import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { UploadedFile } from './entities/uploaded-file.entity';
import { StorageService } from './storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([UploadedFile])],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
