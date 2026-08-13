import { Module } from '@nestjs/common';
import { FuelsRepository } from './repositories/fuels.repository';
import { FuelsService } from './fuels.service';
import { FuelsController } from './fuels.controller';

@Module({
  controllers: [FuelsController],
  providers: [FuelsService, FuelsRepository],
  exports: [FuelsService, FuelsRepository],
})
export class FuelsModule {}
