import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBreakdownStatusDto {
  @ApiProperty({ example: '2026-08-11' })
  @IsDateString()
  date_at!: string;

  @ApiPropertyOptional({ example: 'SHIFT 1' })
  @IsOptional()
  @IsString()
  shift?: string;

  @ApiProperty({ example: 'TR-001' })
  @IsString()
  equipment_code!: string;

  @ApiProperty({ example: 'DOWN' })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ example: 'MESIN' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  time_start?: string;

  @ApiPropertyOptional({ example: '10:30' })
  @IsOptional()
  @IsString()
  time_end?: string;

  @ApiPropertyOptional({ example: '02:30' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @IsString()
  repair_status?: string;

  @ApiPropertyOptional({ example: 'Kerusakan mesin' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Site A' })
  @IsOptional()
  @IsString()
  location?: string;
}