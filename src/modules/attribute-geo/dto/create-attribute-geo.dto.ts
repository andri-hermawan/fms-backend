import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAttributeGeoDto {
  @ApiPropertyOptional({ example: 'Feature' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'Polygon' })
  @IsOptional()
  @IsString()
  geometry_type?: string;

  @ApiPropertyOptional({ example: 'Emplacement' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Office' })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  buff_dist?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orig_fid?: number;

  @ApiPropertyOptional({ example: '0' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: '0' })
  @IsOptional()
  @IsString()
  code_2?: string;

  @ApiPropertyOptional({ example: '#000000' })
  @IsOptional()
  @IsString()
  hex_line?: string;

  @ApiPropertyOptional({ example: '#BEE8FF' })
  @IsOptional()
  @IsString()
  hex_fill?: string;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsInt()
  value1?: number | null;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsInt()
  value2?: number | null;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Project ID (UUID)', example: 'uuid-project' })
  @IsUUID()
  project_id!: string;
}
