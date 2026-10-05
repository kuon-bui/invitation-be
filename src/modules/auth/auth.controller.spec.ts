import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({
        accessToken: 'mock-token',
        user: { id: '1', email: 'test@example.com' },
      }),
      login: jest.fn().mockResolvedValue({
        accessToken: 'mock-token',
        user: { id: '1', email: 'test@example.com' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should register user', async () => {
    const dto = { email: 'test@example.com', password: 'password123', fullName: 'Test' };
    const result = await controller.register(dto);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result).toHaveProperty('accessToken', 'mock-token');
  });

  it('should login user', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const result = await controller.login(dto);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toHaveProperty('accessToken', 'mock-token');
  });

  it('should return current user for getMe', async () => {
    const mockUser = { id: '1', email: 'test@example.com', role: 'USER' };
    const result = await controller.getMe(mockUser);

    expect(result).toEqual(mockUser);
  });
});
