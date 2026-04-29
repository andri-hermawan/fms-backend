import { Module } from '@nestjs/common';
import { EquipmentsService } from './equipments.service';
import { EquipmentsController } from './equipments.controller';
import { EquipmentsRepository } from './repositories/equipments.repository';
@Module({
  controllers: [EquipmentsController],
  providers: [
    EquipmentsService,
    EquipmentsRepository, // <--- Ini yang krusial untuk memperbaiki error Anda
  ],
  exports: [EquipmentsService], // Opsional: jika modul lain butuh service ini
})
export class EquipmentsModule {}
