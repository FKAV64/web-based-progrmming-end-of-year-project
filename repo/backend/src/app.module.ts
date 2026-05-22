import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConditionalThrottlerGuard } from './common/guards/conditional-throttler.guard';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { HealthController } from './modules/health/health.controller';
import { MarketModule } from './modules/market/market.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PushModule } from './modules/push/push.module';
import { DevModule } from './modules/dev/dev.module';

const configModule = ConfigModule.forRoot({ isGlobal: true });
const devOnlyImports =
  process.env.NODE_ENV === 'development' ? [DevModule] : [];

@Module({
  imports: [
    configModule,
    LoggerModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    MarketModule,
    WatchlistModule,
    PortfolioModule,
    AlertsModule,
    PushModule,
    ...devOnlyImports,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ConditionalThrottlerGuard,
    },
  ],
})
export class AppModule {}
