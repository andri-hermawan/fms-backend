import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateSettingOperatorDto {
  @ApiProperty({ example: '2026-08-11' })
  @IsDateString()
  date_at!: string;

  @ApiProperty({ example: 'SHIFT 1' })
  @IsString()
  shift!: string;

  @ApiProperty({ example: 'TR-001' })
  @IsString()
  equipment_code!: string;

  @ApiProperty({ example: 'Budi' })
  @IsString()
  operator_name!: string;

  @ApiPropertyOptional({ example: 'Operator shift pagi' })
  @IsOptional()
  @IsString()
  description?: string;
}