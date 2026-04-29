import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShiftDto {
  @ApiProperty({ example: 'DS' })
  @IsNotEmpty()
  @IsString()
  shift_code!: string;

  @ApiProperty({ example: 'Day Shift' })
  @IsNotEmpty()
  @IsString()
  shift_name?: string;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
