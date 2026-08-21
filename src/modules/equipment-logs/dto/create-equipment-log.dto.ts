import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  // IsString,
  IsUUID,
} from 'class-validator';

export class CreateEquipmentLogDto {
  @ApiProperty({ example: '2026-04-27T10:00:00Z' })
  @IsDateString()
  time!: string;

  @ApiPropertyOptional({ example: 'e725fc54-dd09-4f85-be6f-9527eaf9d9cf' })
  @IsOptional()
  @IsUUID()
  equipment_id?: string;

  @ApiPropertyOptional({ example: '941e0390-9f28-4cea-85f2-8fe3e06a30e6' })
  @IsOptional()
  @IsUUID()
  device_id?: string;

  // ================= GPS =================

  @ApiProperty({ example: -3.6392 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 103.8521 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  fuel_level?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  speed?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  engine_status?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  gsm_signal?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  gsm_operator?: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  altitude?: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  heading?: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  satellites?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  accelerometer_x?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  accelerometer_y?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  accelerometer_z?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  odometer?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  external_voltage?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  internal_battery_voltage?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  battery_current?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  pdop?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  hdop?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  gnss_status?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  fuel_temperature?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sleep_mode?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  movement_runtime?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  analog_input_1?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  mileage?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  vessel?: number;

  @ApiProperty({ example: '2026-04-27T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  created_at?: string;

  // @ApiPropertyOptional({ example: 'Trase Utama' })
  // @IsString()
  // @IsOptional()
  // category_location?: string;

  // @ApiPropertyOptional({ example: 'Km 24+000 - 25+000' })
  // @IsString()
  // @IsOptional()
  // segment?: string;

  // @ApiPropertyOptional({ example: true })
  // @IsBoolean()
  // @IsOptional()
  // is_inside?: boolean;

  // @ApiPropertyOptional({ example: 25 })
  // @IsNumber()
  // @IsOptional()
  // orig_fid?: number;

  // @ApiPropertyOptional({ example: 0 })
  // @IsOptional()
  // @IsNumber()
  // fuel_volume?: number;

  // @ApiPropertyOptional({ example: 0 })
  // @IsOptional()
  // @IsNumber()
  // fuel_percentage?: number;

  // @ApiPropertyOptional({ example: 0 })
  // @IsOptional()
  // @IsNumber()
  // fuel_difference?: number;

  // @ApiPropertyOptional({ example: 'EMPTY' })
  // @IsOptional()
  // @IsString()
  // vessel_status?: string;

  // @ApiPropertyOptional({ example: 'OFFLINE' })
  // @IsOptional()
  // @IsString()
  // status?: string;
}
