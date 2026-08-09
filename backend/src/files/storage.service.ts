import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

/**
 * S3-compatible object storage.
 * Files are NEVER stored inside application containers.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: AWS.S3;
  private readonly bucket: string;
  private readonly cdnUrl: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new AWS.S3({
      endpoint: this.config.get('STORAGE_ENDPOINT'),
      region: this.config.get('STORAGE_REGION'),
      accessKeyId: this.config.get('STORAGE_ACCESS_KEY'),
      secretAccessKey: this.config.get('STORAGE_SECRET_KEY'),
      s3ForcePathStyle: true,
    });
    this.bucket = this.config.get('STORAGE_BUCKET', 'powergas-files');
    this.cdnUrl = this.config.get('STORAGE_CDN_URL', '');
  }

  async upload(buffer: Buffer, mimeType: string, folder: string): Promise<{ key: string; url: string }> {
    const ext = mimeType.split('/')[1] || 'bin';
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.s3.putObject({
      Bucket: this.bucket, Key: key, Body: buffer, ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    }).promise();

    const url = this.cdnUrl ? `${this.cdnUrl}/${key}` : `${this.config.get('STORAGE_ENDPOINT')}/${this.bucket}/${key}`;
    return { key, url };
  }

  async getSignedUrl(key: string, expiresSeconds = 3600): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', { Bucket: this.bucket, Key: key, Expires: expiresSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.s3.deleteObject({ Bucket: this.bucket, Key: key }).promise();
  }
}
