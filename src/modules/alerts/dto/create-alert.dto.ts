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

  @ApiProperty({ example: -6.2345 })
  @IsNotEmpty()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: 106.8123 })
  @IsNotEmpty()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 65.5 })
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ example: 'Overspeed Alert' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  engine_status?: boolean;
}
