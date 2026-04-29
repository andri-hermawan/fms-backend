import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'DT-001' })
  @IsNotEmpty()
  @IsString()
  equipment_code!: string;

  @ApiProperty({ example: 'Dump Truck 10T', required: false })
  @IsOptional()
  @IsString()
  equipment_alias?: string;

  @ApiProperty({ example: 'Dump Truck' })
  @IsNotEmpty()
  @IsString()
  type?: string;

  @ApiProperty({ example: 'Hino' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ example: 'FM 260 JD' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: '30' })
  @IsOptional()
  @IsString()
  class?: string;

  @ApiProperty({ example: 'uuid-project' })
  @IsNotEmpty()
  @IsUUID()
  project_id!: string;

  @ApiProperty({ example: 'active', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
