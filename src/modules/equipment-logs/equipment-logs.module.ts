import { Module } from '@nestjs/common';
import { EquipmentLogsService } from './equipment-logs.service';
import { EquipmentLogsController } from './equipment-logs.controller';
import { EquipmentLogsRepository } from './repositories/equipment-logs.repository';
import { TeltonikaParserService } from './teltonika-parser.service';
import { TeltonikaTcpService } from './teltonika-tcp.service';
import { DevicesModule } from '../devices/devices.module';
import { EquipmentStatusModule } from '../equipment-status/equipment-status.module';
import { EquipmentsModule } from '../equipments/equipments.module';
import { AlertsModule } from '../alerts/alerts.module';
import { FuelsModule } from '../fuels/fuels.module';
import { FuelCalibrationsModule } from '../fuel-calibrations/fuel-calibrations.module';
import { GeofencesModule } from '../geofences/geofences.module';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [
    DevicesModule, // <--- Tambahkan module-nya di sini
    EquipmentStatusModule,
    EquipmentsModule,
    AlertsModule,
    FuelsModule, // <--- Tambahkan module-nya di sini
    FuelCalibrationsModule, // <--- Tambahkan module-nya di sini
    GeofencesModule, // <--- Tambahkan module-nya di sini
    ShiftsModule, // <--- Tambahkan module-nya di sini
  ],
  controllers: [EquipmentLogsController],
  providers: [
    EquipmentLogsService,
    EquipmentLogsRepository,
    TeltonikaParserService,
    TeltonikaTcpService,
  ],
  exports: [EquipmentLogsService],
})
export class EquipmentLogsModule {}
