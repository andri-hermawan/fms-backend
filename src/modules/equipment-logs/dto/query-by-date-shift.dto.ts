import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryByDateShiftDto {
  @ApiPropertyOptional({
    description: 'Filter by created_at date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  created_at?: string;

  @ApiPropertyOptional({ description: 'Filter by shift name' })
  @IsOptional()
  @IsString()
  shift?: string;

  @ApiPropertyOptional({
    description:
      'Speed bucket selector: 0-10, 11-20, 21-30, 31-40, 41-50, or above 50',
    example: '13',
  })
  @IsOptional()
  @IsNumberString()
  speed?: string;
}
