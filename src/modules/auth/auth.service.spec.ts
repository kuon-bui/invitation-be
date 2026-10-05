import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should register a new user with hashed password and return accessToken', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
    (usersService.create as jest.Mock).mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      fullName: 'Nguyen Van A',
      role: 'USER',
    });

    const result = await authService.register({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Nguyen Van A',
    });

    expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
    expect(result.user.email).toBe('test@example.com');
  });

  it('should throw ConflictException if email already registered', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing-id' });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Nguyen Van A',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should validate credentials and login successfully', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    (usersService.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      fullName: 'Nguyen Van A',
      role: 'USER',
    });

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
  });

  it('should throw UnauthorizedException on wrong password', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    (usersService.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      passwordHash: hashedPassword,
    });

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
