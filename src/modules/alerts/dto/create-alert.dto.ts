import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAlertDto {
  @ApiProperty({ example: 'uuid-equipment' })
  @IsNotEmpty()
  @IsUUID()
  equipment_id!: string;

  @ApiProperty({ example: 'uuid-alert-category' })
  @IsNotEmpty()
  @IsUUID()
  alert_category_id!: string;

  @ApiProperty({ example: 'id-equipment-log' })
  @IsNotEmpty()
  log_id!: string | number;

  @ApiProperty({ example: -6.2345 })
  @IsNotEmpty()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: 106.8123 })
  @IsNotEmpty()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  is_inside?: boolean;

  @ApiPropertyOptional({ example: 123 })
  @IsNumber()
  @IsOptional()
  orig_fid?: number;

  @ApiPropertyOptional({ example: 'Location Name' })
  @IsString()
  @IsOptional()
  location_category?: string;

  @ApiPropertyOptional({ example: 'Segment Name' })
  @IsString()
  @IsOptional()
  segment?: string;

  @ApiPropertyOptional({ example: 65.5 })
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ example: 75 })
  @IsNumber()
  @IsOptional()
  fuel_level?: number;

  @ApiPropertyOptional({ example: 75 })
  @IsNumber()
  @IsOptional()
  fuel_volume?: number;

  @ApiPropertyOptional({ example: 75 })
  @IsNumber()
  @IsOptional()
  fuel_percentage?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  fuel_difference?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsNumber()
  @IsOptional()
  fuel_temperature?: number;

  @ApiPropertyOptional({ example: '300' })
  @IsString()
  @IsOptional()
  vessel?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  mileage?: number;

  @ApiPropertyOptional({ example: 'EMPTY' })
  @IsString()
  @IsOptional()
  vessel_status?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  engine_status?: boolean;

  @ApiPropertyOptional({ example: 'Overspeed Alert' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  is_read?: boolean;

  @ApiPropertyOptional({ example: 'SHIFT 1' })
  @IsOptional()
  @IsString()
  shift?: string;
}
