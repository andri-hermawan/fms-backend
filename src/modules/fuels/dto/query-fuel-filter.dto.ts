import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryFuelFilterDto {
  @ApiPropertyOptional({
    description: 'Tanggal mulai (format YYYY-MM-DD atau ISO date)',
    example: '2026-07-21',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Tanggal selesai (format YYYY-MM-DD atau ISO date)',
    example: '2026-07-21',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Kode equipment',
    example: 'DT10205',
  })
  @IsOptional()
  @IsString()
  equipment_code?: string;

  @ApiPropertyOptional({
    description: 'Shift',
    example: 'SHIFT 1',
  })
  @IsOptional()
  @IsString()
  shift?: string;

  @ApiPropertyOptional({ description: 'Halaman ke-n', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
