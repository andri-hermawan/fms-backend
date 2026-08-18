import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryByDateShiftDto {
  @ApiPropertyOptional({ description: 'Filter by created_at date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  created_at?: string;

  @ApiPropertyOptional({ description: 'Filter by equipment_code' })
  @IsOptional()
  @IsString()
  equipment_code?: string;

  @ApiPropertyOptional({ description: 'Filter by shift name' })
  @IsOptional()
  @IsString()
  shift?: string;
}