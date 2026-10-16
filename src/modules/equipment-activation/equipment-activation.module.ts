import { Module } from '@nestjs/common';
import { EquipmentActivationController } from './equipment-activation.controller';
import { EquipmentActivationService } from './equipment-activation.service';
import { EquipmentActivationRepository } from './repositories/equipment-activation.repository';

@Module({
  controllers: [EquipmentActivationController],
  providers: [EquipmentActivationService, EquipmentActivationRepository],
  exports: [EquipmentActivationService, EquipmentActivationRepository],
})
export class EquipmentActivationModule {}
