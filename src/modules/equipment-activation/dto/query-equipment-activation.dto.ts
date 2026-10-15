import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryEquipmentActivationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ example: 'TR-001' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-08-11' })
  @IsOptional()
  @IsDateString()
  date_at?: string;

  @ApiPropertyOptional({ enum: ['Active', 'Non Active'] })
  @IsOptional()
  @IsIn(['Active', 'Non Active'])
  status?: string;

  @ApiPropertyOptional({ example: 'TR-001' })
  @IsOptional()
  @IsString()
  equipment_code?: string;
}
