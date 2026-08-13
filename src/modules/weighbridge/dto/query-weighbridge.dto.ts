import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class QueryWeighbridgeDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'TR-001' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-08-11' })
  @IsOptional()
  @IsDateString()
  date_at?: string;

  @ApiPropertyOptional({ example: 'SHIFT 1' })
  @IsOptional()
  @IsString()
  shift?: string;

  @ApiPropertyOptional({ example: 'WB-001' })
  @IsOptional()
  @IsString()
  ticket_no?: string;

  @ApiPropertyOptional({ example: 'TR-001' })
  @IsOptional()
  @IsString()
  equipment_code?: string;
}