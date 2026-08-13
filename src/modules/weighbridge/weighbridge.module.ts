import { Module } from '@nestjs/common';
import { WeighbridgeController } from './weighbridge.controller';
import { WeighbridgeService } from './weighbridge.service';
import { WeighbridgeRepository } from './repositories/weighbridge.repository';

@Module({
  controllers: [WeighbridgeController],
  providers: [WeighbridgeService, WeighbridgeRepository],
  exports: [WeighbridgeService],
})
export class WeighbridgeModule {}