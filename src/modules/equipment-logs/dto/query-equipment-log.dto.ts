import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryEquipmentLogDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  equipment_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  end_date?: string;
}
