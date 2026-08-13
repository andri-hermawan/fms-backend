import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryAlertDto {
  @ApiPropertyOptional({ description: 'Halaman ke-n', default: 1 })
  @IsOptional()
  @Type(() => Number) // Transform string dari URL menjadi Number
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan equipment_code',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by Alert ID',
    example: '10',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    description: 'Tanggal mulai',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString()
  created_at?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir',
    example: '2026-07-31',
  })
  @IsOptional()
  @IsDateString()
  created_at_end?: string;

  @ApiPropertyOptional({
    description: 'Alert Category ID (UUID)',
  })
  @IsOptional()
  @IsString()
  alert_category_id?: string;

  @ApiPropertyOptional({
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  alert_category?: string[];

  @ApiPropertyOptional({
    description: 'Filter by is_read status (true/false)',
    type: Boolean,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_read?: boolean;
}
