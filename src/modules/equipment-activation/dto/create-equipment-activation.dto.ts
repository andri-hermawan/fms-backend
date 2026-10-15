import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateEquipmentActivationDto {
  @ApiProperty({ example: '2026-08-11' })
  @IsDateString()
  date_at!: string;

  @ApiProperty({ example: 'TR-001' })
  @IsString()
  equipment_code!: string;

  @ApiProperty({ enum: ['Active', 'Non Active'], example: 'Active' })
  @IsIn(['Active', 'Non Active'])
  status!: string;

  @ApiPropertyOptional({ example: 'Equipment aktif untuk operasional' })
  @IsOptional()
  @IsString()
  description?: string;
}
