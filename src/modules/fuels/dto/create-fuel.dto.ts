import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateFuelDto {
  @ApiProperty({ example: 'uuid-equipment-id' })
  @IsNotEmpty()
  @IsUUID()
  equipment_id!: string;

  @ApiPropertyOptional({ example: 'log-id-string' })
  @IsOptional()
  @IsString()
  log_id?: string;

  @ApiPropertyOptional({
    example: 75.5,
    description: 'Fuel level in percentage or voltage',
  })
  @IsOptional()
  @IsNumber()
  fuel_level?: number;

  @ApiPropertyOptional({
    example: 150.25,
    description: 'Fuel volume in Liters',
  })
  @IsOptional()
  @IsNumber()
  fuel_volume?: number;

  @ApiPropertyOptional({ example: 32.5 })
  @IsOptional()
  @IsNumber()
  fuel_temperature?: number;

  @ApiPropertyOptional({ example: 'Refueling detected' })
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

  @ApiPropertyOptional({ example: 'Pit Stop A' })
  @IsOptional()
  @IsString()
  location_category?: string;

  @ApiPropertyOptional({ example: 20.0 })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  engine_status?: boolean;

  @ApiPropertyOptional({ example: 'normal' })
  @IsOptional()
  @IsString()
  status?: string;
}
