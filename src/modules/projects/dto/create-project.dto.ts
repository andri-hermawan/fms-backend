import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'PRJ-IKN-01', description: 'Kode unik proyek' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  project_code!: string;

  @ApiProperty({ example: 'Proyek Tambang Site A', description: 'Nama proyek' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  project_name?: string;

  @ApiProperty({ description: 'ID Perusahaan (UUID) pemilik proyek' })
  @IsUUID()
  @IsNotEmpty()
  company_id!: string;

  @ApiPropertyOptional({ description: 'URL atau path gambar proyek' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    description: 'Data origin dalam format GeoJSON',
    type: Object,
  })
  @IsObject()
  @IsOptional()
  geojson_origin?: any;

  @ApiPropertyOptional({ description: 'Otomatis akan terisi dari file' })
  @IsOptional()
  geom_origin?: any;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;
}
