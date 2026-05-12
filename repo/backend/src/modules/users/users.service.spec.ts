import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  name: 'Tester',
  role: 'USER',
  emailVerifiedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const makeSettings = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  theme: 'SYSTEM',
  currency: 'USD',
  locale: 'TR',
  notificationsEnabled: true,
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: Record<string, Record<string, jest.Mock>>;
  let auditMock: { log: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUniqueOrThrow: jest.fn(),
        delete: jest.fn(),
      },
    };
    auditMock = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findMe', () => {
    it('returns user fields without passwordHash and includes settings', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        ...makeUser(),
        settings: makeSettings(),
      });

      const result = await service.findMe('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Tester',
        role: 'USER',
        createdAt: expect.any(Date),
        settings: expect.objectContaining({ theme: 'SYSTEM' }),
      });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('exportData', () => {
    it('returns full user dump and writes user.exported_data audit', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        ...makeUser(),
        settings: makeSettings(),
        watchlistItems: [],
        positions: [],
        alerts: [],
        pushSubs: [],
        auditLogs: [],
      });

      const result = await service.exportData('user-1', '1.2.3.4', 'agent');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
          settings: expect.any(Object),
          watchlistItems: expect.any(Array),
          positions: expect.any(Array),
          alerts: expect.any(Array),
          pushSubs: expect.any(Array),
          auditLogs: expect.any(Array),
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(auditMock.log).toHaveBeenCalledWith(
        'user.exported_data',
        'user-1',
        '1.2.3.4',
        'agent',
      );
    });
  });

  describe('deleteMe', () => {
    it('writes user.deleted audit BEFORE the delete call', async () => {
      const callOrder: string[] = [];
      auditMock.log.mockImplementation(() => {
        callOrder.push('audit');
        return Promise.resolve();
      });
      prismaMock.user.delete.mockImplementation(() => {
        callOrder.push('delete');
        return Promise.resolve();
      });

      await service.deleteMe('user-1', '1.2.3.4', 'agent');

      expect(callOrder).toEqual(['audit', 'delete']);
      expect(auditMock.log).toHaveBeenCalledWith(
        'user.deleted',
        'user-1',
        '1.2.3.4',
        'agent',
      );
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});
