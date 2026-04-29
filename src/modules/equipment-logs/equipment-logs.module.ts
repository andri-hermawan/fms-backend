import { Module } from '@nestjs/common';
import { EquipmentLogsService } from './equipment-logs.service';
import { EquipmentLogsController } from './equipment-logs.controller';
import { EquipmentLogsRepository } from './repositories/equipment-logs.repository';
import { TeltonikaParserService } from './teltonika-parser.service';
import { TeltonikaTcpService } from './teltonika-tcp.service';
import { DevicesModule } from '../devices/devices.module';
import { EquipmentStatusModule } from '../equipment-status/equipment-status.module';

@Module({
  imports: [
    DevicesModule, // <--- Tambahkan module-nya di sini
    EquipmentStatusModule,
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
