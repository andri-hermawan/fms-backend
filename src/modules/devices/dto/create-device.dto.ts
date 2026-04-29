import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ example: 'GPS-NB-001' })
  @IsNotEmpty()
  @IsString()
  device_code!: string;

  @ApiPropertyOptional({ example: 'GPS Tracker Unit 1' })
  @IsOptional()
  @IsString()
  device_name?: string;

  @ApiPropertyOptional({ example: 'Teltonika' })
  @IsOptional()
  @IsString()
  provider_name?: string;

  @ApiPropertyOptional({ example: '628123456789' })
  @IsOptional()
  @IsString()
  sim_number?: string;

  @ApiPropertyOptional({ example: 'FMB120' })
  @IsOptional()
  @IsString()
  device_model?: string;

  @ApiPropertyOptional({ example: 'uuid-equipment-id' })
  @IsOptional()
  @IsUUID()
  equipment_id?: string;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
