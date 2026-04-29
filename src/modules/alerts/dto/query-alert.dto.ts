import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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
    description: 'Cari berdasarkan equipment_code atau segment',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipment_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (open, resolved, etc)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
