import { IsNotEmpty, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivitySummaryQueryDto {
  @ApiProperty({
    description: 'Equipment ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  equipment_id: string;

  @ApiProperty({
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-08-01',
  })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD)',
    example: '2026-08-06',
  })
  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({
    description: 'Shift filter (e.g. SHIFT 1)',
    example: 'SHIFT 1',
  })
  @IsOptional()
  @IsString()
  shift?: string;
}

export class ActivitySummaryResponseDto {
  equipment_id: string;
  equipment_code: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    running_time: number;
    idling_time: number;
    mileage: number;
    avg_running_speed: number;
    max_running_speed: number;
    fuel_decrease: number;
    fuel_ratio: number;
    fuel_remaining: number;
    fuel_remaining_percentage: number;
  };
}
