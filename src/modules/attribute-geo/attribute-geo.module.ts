import { Module } from '@nestjs/common';
import { AttributeGeoController } from './attribute-geo.controller';
import { AttributeGeoService } from './attribute-geo.service';
import { AttributeGeoRepository } from './repositories/attribute-geo.repository';

@Module({
  controllers: [AttributeGeoController],
  providers: [AttributeGeoService, AttributeGeoRepository],
  exports: [AttributeGeoService],
})
export class AttributeGeoModule {}
