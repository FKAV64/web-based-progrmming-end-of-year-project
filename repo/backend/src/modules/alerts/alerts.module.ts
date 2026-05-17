import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PushModule } from '../push/push.module';
import { MarketModule } from '../market/market.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsEvaluatorService } from './alerts-evaluator.service';
import { AlertsNotifyGateway } from './alerts-notify.gateway';

@Module({
  imports: [
    PushModule,
    MarketModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsEvaluatorService, AlertsNotifyGateway],
})
export class AlertsModule {}
