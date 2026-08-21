import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Prisma } from '../../../../generated/prisma/client';

export class CreateGeofenceDto {
  @ApiProperty({ example: 'uuid-equipment-id' })
  @IsNotEmpty()
  @IsUUID()
  equipment_id?: string;

  @ApiPropertyOptional({ example: '102' })
  @IsOptional()
  @IsNumber()
  log_id?: bigint;

  @ApiPropertyOptional({ example: 'GEOFENCE_VIOLATION' })
  @IsOptional()
  @IsString()
  alert_category?: string;

  @ApiPropertyOptional({ example: 'ENTER', description: 'ENTER or EXIT' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_alert?: boolean;

  @ApiPropertyOptional({ example: 'Unit memasuki area terlarang' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: -6.2345 })
  @IsNotEmpty()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: 106.8123 })
  @IsNotEmpty()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_inside!: boolean | null;

  @ApiProperty({ example: 12 })
  @IsNotEmpty()
  @IsNumber()
  orig_fid?: number | null;

  @ApiPropertyOptional({ example: 'PIT A' })
  @IsOptional()
  @IsString()
  location_category?: string | null;

  @ApiPropertyOptional({ example: 'South Segment' })
  @IsOptional()
  @IsString()
  segment?: string | null;

  @ApiPropertyOptional({ example: 25.5 })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ example: 78.5 })
  @IsOptional()
  @IsNumber()
  fuel_level?: number;

  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @IsString()
  vessel?: string | null;

  @ApiPropertyOptional({ example: 1250.5 })
  @IsOptional()
  @IsNumber()
  mileage?: Prisma.Decimal | number | null;

  @ApiPropertyOptional({ example: 'MOVING' })
  @IsOptional()
  @IsString()
  vessel_status?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  engine_status?: boolean;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'SHIFT 1' })
  @IsOptional()
  @IsString()
  shift?: string | null;

  @ApiProperty({ example: '2026-04-27T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  created_at?: string;
}
