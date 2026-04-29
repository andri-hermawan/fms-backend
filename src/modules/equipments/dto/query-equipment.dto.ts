import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryEquipmentDto {
  @ApiPropertyOptional({ description: 'Halaman ke-n', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Cari berdasarkan kode atau alias' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan project ID' })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan tipe alat (Truck, Excavator, dll.)',
  })
  @IsOptional()
  @IsString()
  type?: string;
}
