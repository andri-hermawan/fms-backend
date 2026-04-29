import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'ID Project (jika user di-assign ke project tertentu)',
  })
  @IsUUID()
  @IsOptional()
  project_id?: string;

  @ApiProperty({ example: 'John Doe', description: 'Nama lengkap pengguna' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ApiProperty({ example: 'admin@fms.com', description: 'Email unik pengguna' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email?: string;

  @ApiProperty({
    example: 'P@ssw0rd123',
    description: 'Password minimal 6 karakter',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    example: 'admin',
    description: 'Role pengguna (superadmin/admin/viewer)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  role?: string;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;
}
