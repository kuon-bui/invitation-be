import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

describe('MediaController', () => {
  let controller: MediaController;
  let service: Partial<Record<keyof MediaService, jest.Mock>>;

  beforeEach(async () => {
    service = {
      generatePresignedUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('should call generatePresignedUrl and return result', async () => {
    const mockResult = {
      uploadUrl: 'https://r2.cloudflarestorage.com/upload-target',
      fileUrl: 'https://cdn.example.com/gallery/123-uuid.jpg',
      key: 'gallery/123-uuid.jpg',
      expiresIn: 900,
    };
    service.generatePresignedUrl!.mockResolvedValue(mockResult);

    const dto = {
      filename: 'wedding.jpg',
      fileType: 'image/jpeg',
      folder: 'gallery',
    };

    const result = await controller.getPresignedUrl(dto);
    expect(result).toBe(mockResult);
    expect(service.generatePresignedUrl).toHaveBeenCalledWith(dto);
  });
});
