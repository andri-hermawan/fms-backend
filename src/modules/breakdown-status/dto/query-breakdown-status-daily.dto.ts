import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const toArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
};

export class QueryBreakdownStatusDailyDto {
  @ApiProperty({
    description:
      'Tanggal awal periode (YYYY-MM-DD). Kolom tanggal pada matrix akan dimulai dari tanggal ini.',
    example: '2026-09-01',
  })
  @IsDateString()
  start_date!: string;

  @ApiProperty({
    description: 'Tanggal akhir periode (YYYY-MM-DD)',
    example: '2026-09-07',
  })
  @IsDateString()
  end_date!: string;

  @ApiPropertyOptional({
    description:
      'Filter shift, bisa lebih dari satu (contoh: shift=Shift 1&shift=Shift 2)',
    example: 'Shift 1',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsString({ each: true })
  shift?: string[];

  @ApiPropertyOptional({
    description:
      'Filter asset/equipment code, bisa lebih dari satu (contoh: equipment_code=DT10193)',
    example: 'DT10193',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsString({ each: true })
  equipment_code?: string[];

  @ApiPropertyOptional({
    description:
      'Pengaman teknis: batas maksimal jumlah hari yang bisa ditarik dalam satu request (default 31, bukan filter data).',
    example: 31,
    default: 31,
    minimum: 1,
    maximum: 366,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(366)
  max_days?: number = 31;
}
