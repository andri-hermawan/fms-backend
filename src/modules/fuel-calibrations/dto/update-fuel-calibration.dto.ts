import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateFuelCalibrationDto } from './create-fuel-calibration.dto';

// calibration_type berlaku untuk seluruh titik equipment, jadi tidak boleh
// diubah per baris (gunakan PUT equipment/:equipmentId).
export class UpdateFuelCalibrationDto extends PartialType(
  OmitType(CreateFuelCalibrationDto, ['calibration_type'] as const),
) {}
