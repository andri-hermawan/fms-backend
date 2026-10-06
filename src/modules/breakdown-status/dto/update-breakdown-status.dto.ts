import { PartialType } from '@nestjs/swagger';
import { CreateBreakdownStatusDto } from './create-breakdown-status.dto';

export class UpdateBreakdownStatusDto extends PartialType(
  CreateBreakdownStatusDto,
) {}
