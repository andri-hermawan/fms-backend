import { Module } from '@nestjs/common';
import { EquipmentStatusService } from './equipment-status.service';
import { EquipmentStatusRepository } from './repositories/equipment-status.repository';
import { EquipmentStatusController } from './equipment-status.controller';

@Module({
  controllers: [EquipmentStatusController],
  providers: [EquipmentStatusService, EquipmentStatusRepository],
  exports: [EquipmentStatusService, EquipmentStatusRepository],
})
export class EquipmentStatusModule {}
