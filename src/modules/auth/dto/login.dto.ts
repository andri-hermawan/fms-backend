import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'andri.hermawan@fms.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'rmk2026' })
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
