import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateEquipmentLogDto {
  @ApiProperty({ example: '2026-04-27T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  time!: Date;

  @ApiProperty({ example: 'uuid-equipment' })
  @IsOptional()
  @IsUUID()
  equipment_id?: string;

  @ApiProperty({ example: 'uuid-device' })
  @IsOptional()
  @IsUUID()
  device_id?: string;

  @ApiProperty({ example: -6.2921 })
  @IsNotEmpty()
  latitude?: number;

  @ApiProperty({ example: 106.8166 })
  @IsNotEmpty()
  longitude?: number;

  @ApiPropertyOptional({ example: 45.5 })
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ example: 80.2 })
  @IsOptional()
  fuel_level?: number;

  @ApiPropertyOptional({ example: 1250.5 })
  @IsOptional()
  mileage?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  engine_status?: boolean;

  @ApiPropertyOptional({ example: 'moving' })
  @IsOptional()
  @IsString()
  vessel_status?: string;
}
