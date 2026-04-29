import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryDeviceDto {
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
    description: 'Cari berdasarkan device_code atau name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan status' })
  @IsOptional()
  @IsString()
  status?: string;
}
