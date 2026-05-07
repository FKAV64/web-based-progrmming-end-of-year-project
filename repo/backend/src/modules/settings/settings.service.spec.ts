import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prismaMock: { userSettings: Record<string, jest.Mock> };
  let auditMock: { log: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      userSettings: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };

    auditMock = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  it('findOne reads the row by userId', async () => {
    prismaMock.userSettings.findUniqueOrThrow.mockResolvedValue({
      userId: 'user-1',
      theme: 'SYSTEM',
    });

    const result = await service.findOne('user-1');

    expect(prismaMock.userSettings.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(result.userId).toBe('user-1');
  });

  it('update applies a partial patch', async () => {
    prismaMock.userSettings.update.mockResolvedValue({
      userId: 'user-1',
      theme: 'DARK',
      currency: 'TRY',
      locale: 'EN',
      notificationsEnabled: false,
    });

    const result = await service.update('user-1', {
      theme: 'DARK',
      currency: 'TRY',
    }, '127.0.0.1', 'jest');

    expect(prismaMock.userSettings.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { theme: 'DARK', currency: 'TRY' },
    });
    expect(auditMock.log).toHaveBeenCalledWith(
      'user.settings_changed',
      'user-1',
      '127.0.0.1',
      'jest',
      { theme: 'DARK', currency: 'TRY' }
    );
    expect(result.theme).toBe('DARK');
    expect(result.currency).toBe('TRY');
  });
});
