import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateWeighbridgeDto {
  @ApiProperty({ example: '2026-08-11' })
  @IsDateString()
  date_at!: string;

  @ApiPropertyOptional({ example: 'SHIFT 1' })
  @IsOptional()
  @IsString()
  shift?: string;

  @ApiPropertyOptional({ example: 'WB-001' })
  @IsOptional()
  @IsString()
  ticket_no?: string;

  @ApiProperty({ example: 'TR-001' })
  @IsString()
  equipment_code!: string;

  @ApiPropertyOptional({ example: 'BATUBARA' })
  @IsOptional()
  @IsString()
  product?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gross?: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tare?: number;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  net?: number;

  @ApiPropertyOptional({ example: 'Budi' })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiPropertyOptional({ example: 'PT Maju' })
  @IsOptional()
  @IsString()
  customer?: string;

  @ApiPropertyOptional({ example: 'Transporter A' })
  @IsOptional()
  @IsString()
  transporter?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  gross_time?: string;

  @ApiPropertyOptional({ example: '08:30' })
  @IsOptional()
  @IsString()
  tare_time?: string;

  @ApiPropertyOptional({ example: 'Operator 1' })
  @IsOptional()
  @IsString()
  gross_operator?: string;

  @ApiPropertyOptional({ example: 'Operator 2' })
  @IsOptional()
  @IsString()
  tare_operator?: string;

  @ApiPropertyOptional({ example: 'Catatan' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Site A' })
  @IsOptional()
  @IsString()
  location?: string;
}