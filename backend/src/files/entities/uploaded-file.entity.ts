import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { FilePurpose } from '../../common/enums';

@Entity('uploaded_files')
@Index(['uploadedBy'])
@Index(['purpose'])
export class UploadedFile extends BaseEntity {
  @Column({ type: 'uuid', name: 'uploaded_by' })
  uploadedBy: string;

  @Column({ type: 'enum', enum: FilePurpose })
  purpose: FilePurpose;

  @Column({ type: 'varchar', length: 500, name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'varchar', length: 255, name: 'file_key' })
  fileKey: string;

  @Column({ type: 'varchar', length: 100, name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint', name: 'size_bytes' })
  sizeBytes: number;

  @Column({ type: 'uuid', nullable: true, name: 'related_id' })
  relatedId: string | null;

  @Column({ type: 'boolean', default: false, name: 'malware_scanned' })
  malwareScanned: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_safe' })
  isSafe: boolean;
}
