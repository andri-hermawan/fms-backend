import { PartialType } from '@nestjs/mapped-types';
import { CreateSettingOperatorDto } from './create-setting-operator.dto';

export class UpdateSettingOperatorDto extends PartialType(
  CreateSettingOperatorDto,
) {}