import { Module } from '@nestjs/common';
import { FuelCalibrationsController } from './fuel-calibrations.controller';
import { FuelCalibrationsService } from './fuel-calibrations.service';
import { FuelCalibrationsRepository } from './repositories/fuel-calibrations.repository';

@Module({
  controllers: [FuelCalibrationsController],
  providers: [FuelCalibrationsService, FuelCalibrationsRepository],
  exports: [FuelCalibrationsService],
})
export class FuelCalibrationsModule {}
