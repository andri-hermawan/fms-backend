import { Module } from '@nestjs/common';
import { BreakdownStatusController } from './breakdown-status.controller';
import { BreakdownStatusService } from './breakdown-status.service';
import { BreakdownStatusRepository } from './repositories/breakdown-status.repository';

@Module({
  controllers: [BreakdownStatusController],
  providers: [BreakdownStatusService, BreakdownStatusRepository],
  exports: [BreakdownStatusService],
})
export class BreakdownStatusModule {}
