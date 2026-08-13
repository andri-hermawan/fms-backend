import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpsertEquipmentStatusDto {
  @IsNotEmpty()
  @IsUUID()
  equipment_id!: string;

  @IsOptional()
  log_id?: string; // Akan dikonversi ke bigint

  @IsNotEmpty()
  @IsNumber()
  latitude?: number;

  @IsNotEmpty()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  fuel_level?: number;

  @IsOptional()
  @IsNumber()
  alert_count?: number;

  @IsOptional()
  @IsBoolean()
  engine_status?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}
