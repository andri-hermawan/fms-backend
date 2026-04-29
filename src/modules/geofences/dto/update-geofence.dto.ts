import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateGeofenceDto } from './create-geofence.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateGeofenceDto extends PartialType(CreateGeofenceDto) {
  @ApiPropertyOptional({ example: 'resolved' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolved_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  resolved_by?: string;
}
