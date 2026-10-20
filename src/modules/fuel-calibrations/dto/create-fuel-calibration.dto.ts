import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsIn,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CALIBRATION_TYPES = ['LLS', 'PERCENTAGE'] as const;
export type CalibrationType = (typeof CALIBRATION_TYPES)[number];

export class CreateFuelCalibrationDto {
  @ApiProperty({ description: 'ID Equipment (UUID) ' })
  @IsUUID()
  @IsNotEmpty()
  equipment_id!: string;

  @ApiProperty({ description: 'Satuan liter (kapasitas tangki)' })
  @IsNumber()
  fuel_volume!: number;

  @ApiPropertyOptional({
    description:
      'Nilai LLS device pada tangki penuh. Diabaikan (otomatis 100) bila calibration_type = PERCENTAGE',
  })
  @ValidateIf(
    (o: CreateFuelCalibrationDto) => o.calibration_type !== 'PERCENTAGE',
  )
  @IsNumber()
  fuel_level?: number;

  @ApiPropertyOptional({
    enum: CALIBRATION_TYPES,
    default: 'LLS',
    description: 'LLS = nilai mentah sensor, PERCENTAGE = persen 0-100 (ECU)',
  })
  @IsOptional()
  @IsIn(CALIBRATION_TYPES)
  calibration_type?: CalibrationType;
}
