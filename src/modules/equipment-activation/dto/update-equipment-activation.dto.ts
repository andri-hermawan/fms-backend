import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipmentActivationDto } from './create-equipment-activation.dto';

export class UpdateEquipmentActivationDto extends PartialType(
  CreateEquipmentActivationDto,
) {}
