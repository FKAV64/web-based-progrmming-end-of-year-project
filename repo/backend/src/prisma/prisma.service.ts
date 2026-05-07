import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * NestJS-managed Prisma client that establishes the database connection
 * during module initialization.
 *
 * Extending PrismaClient directly exposes all generated query methods
 * (e.g. this.user.findUnique) on the service so it can be injected
 * wherever database access is needed without extra boilerplate.
 *
 * @module PrismaService
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
