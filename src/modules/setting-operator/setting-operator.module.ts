import { Module } from '@nestjs/common';
import { SettingOperatorController } from './setting-operator.controller';
import { SettingOperatorService } from './setting-operator.service';
import { SettingOperatorRepository } from './repositories/setting-operator.repository';
import { EquipmentsModule } from '../equipments/equipments.module';
import { EquipmentStatusModule } from '../equipment-status/equipment-status.module';

@Module({
  imports: [EquipmentsModule, EquipmentStatusModule],
  controllers: [SettingOperatorController],
  providers: [SettingOperatorService, SettingOperatorRepository],
  exports: [SettingOperatorService],
})
export class SettingOperatorModule {}