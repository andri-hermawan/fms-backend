import { PartialType } from '@nestjs/swagger';
import { CreateFuelCalibrationDto } from './create-fuel-calibration.dto';

export class UpdateFuelCalibrationDto extends PartialType(
  CreateFuelCalibrationDto,
) {}
