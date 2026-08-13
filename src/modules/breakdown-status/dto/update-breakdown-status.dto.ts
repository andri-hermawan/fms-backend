import { PartialType } from '@nestjs/mapped-types';
import { CreateBreakdownStatusDto } from './create-breakdown-status.dto';

export class UpdateBreakdownStatusDto extends PartialType(
  CreateBreakdownStatusDto,
) {}