import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, IsUUID, IsInt, Min } from 'class-validator';

export class CreateShiftDto {
  @ApiProperty({ example: 'DS' })
  @IsNotEmpty()
  @IsString()
  shift_code!: string;

  @ApiProperty({ example: 'Day Shift' })
  @IsNotEmpty()
  @IsString()
  shift_name?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiProperty({ example: '07:00:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  start_time!: string;

  @ApiProperty({ example: '19:00:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  end_time!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional({ example: 'Asia/Jakarta', default: 'Asia/Jakarta' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
