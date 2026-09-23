import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class AlertSummaryDto {
  @ApiProperty({
    description: 'Tanggal (YYYY-MM-DD)',
    example: '2026-07-01',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Shift',
    example: 'DS',
  })
  @IsNotEmpty()
  @IsString()
  shift: string;
}
