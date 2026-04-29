import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EquipmentsService } from './equipments.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../core/decorators/get-user.decorator'; // Sesuaikan path importnya
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Equipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipments')
export class EquipmentsController {
  constructor(private readonly equipmentsService: EquipmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Mendaftarkan alat berat/equipment baru' })
  @ApiResponse({ status: 201, description: 'Equipment berhasil didaftarkan.' })
  @ApiResponse({ status: 409, description: 'Equipment code sudah digunakan.' })
  create(@Body() dto: CreateEquipmentDto, @GetUser('userId') userId: string) {
    return this.equipmentsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar equipment dengan filter & pagination',
  })
  findAll(@Query() query: QueryEquipmentDto) {
    return this.equipmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail equipment berdasarkan ID' })
  findOne(@Param('id') id: string) {
    return this.equipmentsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui data equipment' })
  @ApiResponse({ status: 200, description: 'Equipment berhasil diperbarui.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
    @GetUser('userId') userId: string, // Jauh lebih bersih dan type-safe
  ) {
    return this.equipmentsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data equipment' })
  @ApiResponse({ status: 200, description: 'Equipment berhasil dihapus.' })
  remove(@Param('id') id: string) {
    return this.equipmentsService.remove(id);
  }
}
