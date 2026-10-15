import { PartialType } from '@nestjs/swagger';
import { CreateReportScheduleDto } from './create-report-schedule.dto';

export class UpdateReportScheduleDto extends PartialType(
  CreateReportScheduleDto,
) {}
