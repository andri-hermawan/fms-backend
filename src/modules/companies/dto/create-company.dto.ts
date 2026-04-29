import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Kode unik perusahaan',
    example: 'CMP-001',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  company_code!: string;

  @ApiProperty({
    description: 'Nama lengkap perusahaan',
    example: 'PT. Teknologi Logistik Nusantara',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  company_name?: string;

  @ApiPropertyOptional({
    description: 'Status perusahaan (active/inactive)',
    example: 'active',
    default: 'active',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;
}
