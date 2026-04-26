import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
