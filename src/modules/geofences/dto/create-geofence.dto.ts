import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateGeofenceDto {
  @ApiProperty({ example: 'uuid-equipment-id' })
  @IsNotEmpty()
  @IsUUID()
  equipment_id!: string;

  @ApiPropertyOptional({ example: 'log-id-string' })
  @IsOptional()
  @IsString()
  log_id?: string;

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
  is_inside?: boolean;

  @ApiPropertyOptional({ example: 'PIT A' })
  @IsOptional()
  @IsString()
  location_category?: string;

  @ApiPropertyOptional({ example: 'South Segment' })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ example: 25.5 })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  engine_status?: boolean;
}
