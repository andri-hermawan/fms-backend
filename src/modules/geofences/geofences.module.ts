import { Module } from '@nestjs/common';
import { GeofencesController } from './geofences.controller';
import { GeofencesService } from './geofences.service';
import { GeofencesRepository } from './repositories/geofences.repository';

@Module({
  controllers: [GeofencesController],
  providers: [GeofencesService, GeofencesRepository],
})
export class GeofencesModule {}
