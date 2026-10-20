import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { EquipmentLogsModule } from '../equipment-logs/equipment-logs.module';
import { TeltonikaCodecParser } from './protocols/teltonika/teltonika-codec.parser';
import { DeviceAdapterRegistry } from './adapters/adapter.registry';
import { Fmc125Adapter } from './adapters/fmc125.adapter';
import { Fmc150Adapter } from './adapters/fmc150.adapter';
import { GenericDeviceAdapter } from './adapters/generic.adapter';
import { DeviceTcpService } from './device-tcp.service';

@Module({
  imports: [DevicesModule, EquipmentLogsModule],
  providers: [
    TeltonikaCodecParser,
    Fmc125Adapter,
    Fmc150Adapter,
    GenericDeviceAdapter,
    DeviceAdapterRegistry,
    DeviceTcpService,
  ],
})
export class DeviceGatewayModule {}
