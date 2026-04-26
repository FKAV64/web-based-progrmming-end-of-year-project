import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { MarketModule } from '../market/market.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsEvaluatorService } from './alerts-evaluator.service';

@Module({
  imports: [PushModule, MarketModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsEvaluatorService],
})
export class AlertsModule {}
