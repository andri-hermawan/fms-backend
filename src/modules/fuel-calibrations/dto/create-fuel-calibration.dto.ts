import { IsNotEmpty, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFuelCalibrationDto {
  @ApiProperty({ description: 'ID Equipment (UUID) ' })
  @IsUUID()
  @IsNotEmpty()
  equipment_id!: string;

  @ApiProperty({ description: 'Satuan liter' })
  @IsNumber()
  fuel_volume!: number;

  @ApiProperty({ description: 'Nilai LLS device' })
  @IsNumber()
  fuel_level!: number;
}
