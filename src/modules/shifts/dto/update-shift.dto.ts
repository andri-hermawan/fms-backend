import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftDto } from './create-shift.dto';

// Secara otomatis mengambil properti dari CreateShiftDto dan membuatnya menjadi opsional
export class UpdateShiftDto extends PartialType(CreateShiftDto) {}
