import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesRepository } from './repositories/devices.repository';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository],
  exports: [DevicesService, DevicesRepository],
})
export class DevicesModule {}
