import { IsOptional, IsString, IsInt, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAlertRuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsUUID()
  alert_category_id?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
