import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { PresignedUrlDto } from './dto/presigned-url.dto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
]);

@Injectable()
export class MediaService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || 'dummy-access-key',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'dummy-secret-key',
      },
    });
  }

  async generatePresignedUrl(dto: PresignedUrlDto): Promise<{
    uploadUrl: string;
    fileUrl: string;
    key: string;
    expiresIn: number;
  }> {
    if (!ALLOWED_MIME_TYPES.has(dto.fileType?.toLowerCase())) {
      throw new BadRequestException(`Unsupported file type: ${dto.fileType}`);
    }

    const folder = (dto.folder || 'uploads').replace(/^\/+|\/+$/g, '');
    const ext = path.extname(dto.filename).replace(/^\./, '').toLowerCase() || 'bin';
    const key = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;
    const bucket = process.env.S3_BUCKET_NAME || '';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: dto.fileType,
    });

    const expiresIn = 900;
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    const publicDomain = (process.env.S3_PUBLIC_DOMAIN || '').replace(/\/+$/, '');
    const fileUrl = publicDomain ? `${publicDomain}/${key}` : `/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
      expiresIn,
    };
  }
}
