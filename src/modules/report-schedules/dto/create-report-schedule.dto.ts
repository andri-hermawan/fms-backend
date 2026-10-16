import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { REPORT_TYPES } from '../report-registry';

export class CreateReportScheduleDto {
  @ApiProperty({ example: 'Alert Summary Shift 1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'alert_summary', enum: REPORT_TYPES })
  @IsIn(REPORT_TYPES)
  report_type!: string;

  @ApiProperty({ example: 'Shift 1', description: 'shift_name' })
  @IsString()
  @IsNotEmpty()
  shift!: string;

  @ApiPropertyOptional({
    example: -1,
    description: 'Selisih hari dari tanggal kirim (-1 = data kemarin)',
  })
  @IsOptional()
  @IsInt()
  @Min(-31)
  @Max(0)
  date_offset?: number;

  @ApiProperty({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'send_time harus HH:mm' })
  send_time!: string;

  @ApiPropertyOptional({ example: 'Asia/Jakarta' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ type: [String], description: 'ID user penerima' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  user_ids!: string[];

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
