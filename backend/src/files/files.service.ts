import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadedFile } from './entities/uploaded-file.entity';
import { StorageService } from './storage.service';
import { FilePurpose } from '../common/enums';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(UploadedFile) private readonly fileRepo: Repository<UploadedFile>,
    private readonly storage: StorageService,
  ) {}

  async upload(
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
    purpose: FilePurpose,
    relatedId?: string,
  ): Promise<UploadedFile> {
    // Validation
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File exceeds maximum size of 10MB');
    }

    // Malware scan hook (integrate ClamAV / VirusTotal in production)
    const isSafe = await this.scanForMalware(file.buffer);
    if (!isSafe) throw new BadRequestException('File failed security scan');

    const { key, url } = await this.storage.upload(file.buffer, file.mimetype, purpose.toLowerCase());

    return this.fileRepo.save(this.fileRepo.create({
      uploadedBy: userId, purpose, fileUrl: url, fileKey: key,
      mimeType: file.mimetype, sizeBytes: file.size, relatedId,
      malwareScanned: true, isSafe: true,
    }));
  }

  async getSignedUrl(fileId: string): Promise<string> {
    const file = await this.fileRepo.findOneOrFail({ where: { id: fileId } });
    return this.storage.getSignedUrl(file.fileKey);
  }

  private async scanForMalware(buffer: Buffer): Promise<boolean> {
    // Malware scanning hook — integrate ClamAV daemon or cloud scanner
    return true;
  }
}
