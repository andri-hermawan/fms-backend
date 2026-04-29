import { Controller, Get, UseGuards } from '@nestjs/common';
import { EquipmentStatusService } from './equipment-status.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Equipment Status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment-status')
export class EquipmentStatusController {
  constructor(private readonly service: EquipmentStatusService) {}

  @Get('live')
  @ApiOperation({
    summary: 'Mendapatkan posisi terakhir semua alat untuk Live Map',
  })
  findAll() {
    return this.service.findAll();
  }
}
