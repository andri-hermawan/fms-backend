import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAlertCategoryDto {
  @ApiProperty({ example: 'FATIGUE' })
  @IsNotEmpty()
  @IsString()
  alert_category_code!: string;

  @ApiProperty({ example: 'Fatigue & Distraction' })
  @IsNotEmpty()
  @IsString()
  alert_category_name?: string;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
