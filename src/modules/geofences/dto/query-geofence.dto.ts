import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryGeofenceDto {
  @ApiPropertyOptional({
    description: 'Halaman ke-n',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Jumlah data per halaman',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan equipment_code atau segment',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Equipment ID',
  })
  @IsOptional()
  @IsString()
  equipment_id?: string;

  @ApiPropertyOptional({
    description: 'Equipment Code',
    example: 'DT10205',
  })
  @IsOptional()
  @IsString()
  equipment_code?: string;

  @ApiPropertyOptional({
    description: 'Segment',
    example: 'Km 24+000 - 25+000',
  })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (open, resolved, etc)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Tanggal mulai',
    example: '2026-07-21',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Tanggal selesai',
    example: '2026-07-21',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}
