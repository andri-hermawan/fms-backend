import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';

// Secara otomatis mengambil properti dari CreateCompanyDto dan membuatnya menjadi opsional
export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
