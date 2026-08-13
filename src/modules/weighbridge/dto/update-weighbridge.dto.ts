import { PartialType } from '@nestjs/mapped-types';
import { CreateWeighbridgeDto } from './create-weighbridge.dto';

export class UpdateWeighbridgeDto extends PartialType(CreateWeighbridgeDto) {}