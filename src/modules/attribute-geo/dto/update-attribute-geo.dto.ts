import { PartialType } from '@nestjs/mapped-types';
import { CreateAttributeGeoDto } from './create-attribute-geo.dto';

export class UpdateAttributeGeoDto extends PartialType(CreateAttributeGeoDto) {}
