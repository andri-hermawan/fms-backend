import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { ShiftsRepository } from './repositories/shifts.repository';

@Module({
  controllers: [ShiftsController],
  providers: [ShiftsService, ShiftsRepository],
  exports: [ShiftsService], // Di-export agar modul Project nanti bisa melakukan validasi existensi Company
})
export class ShiftsModule {}
