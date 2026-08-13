import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertsRepository } from './repositories/alerts.repository';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, AlertsRepository],
  exports: [AlertsService, AlertsRepository],
})
export class AlertsModule {}
