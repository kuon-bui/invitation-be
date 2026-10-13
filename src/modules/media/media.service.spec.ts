import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { BadRequestException } from '@nestjs/common';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.S3_PUBLIC_DOMAIN = 'https://cdn.example.com';

    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaService],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should generate presigned url for allowed image types', async () => {
    const result = await service.generatePresignedUrl({
      filename: 'wedding-photo.jpg',
      fileType: 'image/jpeg',
      folder: 'gallery',
    });

    expect(result).toHaveProperty('uploadUrl');
    expect(result).toHaveProperty('fileUrl');
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('expiresIn', 900);
    expect(result.fileUrl).toContain('https://cdn.example.com/gallery/');
    expect(result.key).toMatch(/^gallery\/\d+-[a-f0-9-]+\.jpg$/);
  });

  it('should generate presigned url for allowed audio types and default folder to uploads', async () => {
    const result = await service.generatePresignedUrl({
      filename: 'background-music.mp3',
      fileType: 'audio/mpeg',
    });

    expect(result).toHaveProperty('uploadUrl');
    expect(result).toHaveProperty('fileUrl');
    expect(result.fileUrl).toContain('https://cdn.example.com/uploads/');
    expect(result.key).toMatch(/^uploads\/\d+-[a-f0-9-]+\.mp3$/);
  });

  describe('S3-compatible endpoint (MinIO)', () => {
    beforeEach(() => {
      process.env.S3_ENDPOINT = 'https://minio.example.com:9000';
    });

    afterEach(() => {
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_FORCE_PATH_STYLE;
    });

    it('should sign path-style upload url when S3_FORCE_PATH_STYLE=true', async () => {
      process.env.S3_FORCE_PATH_STYLE = 'true';
      const result = await new MediaService().generatePresignedUrl({
        filename: 'photo.png',
        fileType: 'image/png',
        folder: 'gallery',
      });

      expect(result.uploadUrl.startsWith('https://minio.example.com:9000/test-bucket/gallery/')).toBe(true);
    });

    it('should keep virtual-hosted upload url by default', async () => {
      const result = await new MediaService().generatePresignedUrl({
        filename: 'photo.png',
        fileType: 'image/png',
        folder: 'gallery',
      });

      expect(result.uploadUrl.startsWith('https://test-bucket.minio.example.com:9000/gallery/')).toBe(true);
    });
  });

  it('should throw BadRequestException on forbidden file types', async () => {
    await expect(
      service.generatePresignedUrl({
        filename: 'malicious.exe',
        fileType: 'application/x-msdownload',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for unsupported mime type', async () => {
    await expect(
      service.generatePresignedUrl({
        filename: 'document.pdf',
        fileType: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
