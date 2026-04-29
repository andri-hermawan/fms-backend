import { PartialType } from '@nestjs/mapped-types';
import { CreateAlertCategoryDto } from './create-alert-category.dto';

// Secara otomatis mengambil properti dari CreateAlertCategoryDto dan membuatnya menjadi opsional
export class UpdateAlertCategoryDto extends PartialType(
  CreateAlertCategoryDto,
) {}
