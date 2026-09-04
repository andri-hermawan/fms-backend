import { Module } from '@nestjs/common';
import { BreakdownStatusController } from './breakdown-status.controller';
import { BreakdownStatusService } from './breakdown-status.service';
import { BreakdownStatusRepository } from './repositories/breakdown-status.repository';
import { EquipmentsModule } from '../equipments/equipments.module';
import { EquipmentStatusModule } from '../equipment-status/equipment-status.module';

@Module({
  imports: [EquipmentsModule, EquipmentStatusModule],
  controllers: [BreakdownStatusController],
  providers: [BreakdownStatusService, BreakdownStatusRepository],
  exports: [BreakdownStatusService],
})
export class BreakdownStatusModule {}
