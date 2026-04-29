import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Menggunakan PartialType dari @nestjs/swagger agar dokumentasi Swagger juga ikut ter-update
export class UpdateUserDto extends PartialType(CreateUserDto) {}
