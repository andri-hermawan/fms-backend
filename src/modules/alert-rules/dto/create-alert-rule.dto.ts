import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateAlertRuleDto {
  @ApiProperty({ example: 'ac85c75e-39ee-4cd9-ba7d-2822948d6022' })
  @IsNotEmpty()
  @IsUUID()
  alert_category_id!: string;

  @ApiPropertyOptional({
    description: 'Kosongkan untuk rule global',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  project_id?: string | null;

  @ApiPropertyOptional({
    description:
      'Nama segment (attribute_geo.segment). Diisi untuk rule per segment (wajib bersama project_id). Pilihan: GET /alert-rules/segments?project_id=',
    nullable: true,
    example: 'Segment 1',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(50)
  segment?: string | null;

  @ApiPropertyOptional({
    description: 'Durasi kondisi harus bertahan sebelum alert dibuat (menit)',
    nullable: true,
    example: 1,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(0)
  duration_minutes?: number | null;

  @ApiPropertyOptional({
    description:
      'Batas kecepatan km/h (Overspeed: speed > limit, Underspeed: 0 < speed < limit)',
    nullable: true,
    example: 50,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(0)
  speed_limit?: number | null;

  @ApiPropertyOptional({
    description:
      'Batas selisih fuel dalam liter (alert jika selisih <= nilai ini)',
    nullable: true,
    example: -5,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  fuel_threshold?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
