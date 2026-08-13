import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ParseFloatPipe,
  ParseUUIDPipe,
  UseGuards,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FuelCalibrationsService } from './fuel-calibrations.service';
import { QueryFuelCalibrationDto } from './dto/query-fuel-calibration.dto';
import { CreateFuelCalibrationDto } from './dto/create-fuel-calibration.dto';
import { UpdateFuelCalibrationDto } from './dto/update-fuel-calibration.dto';
import { GetUser } from '../../core/decorators/get-user.decorator';

@ApiTags('Fuel Calibrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fuel-calibrations')
export class FuelCalibrationsController {
  constructor(
    private readonly fuelCalibrationsService: FuelCalibrationsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Generate fuel calibration berdasarkan kapasitas tangki',
  })
  @ApiResponse({
    status: 201,
    description: 'Fuel calibration berhasil dibuat.',
  })
  create(
    @Body() dto: CreateFuelCalibrationDto,
    @GetUser('userId') userId: string,
  ) {
    return this.fuelCalibrationsService.create(dto, userId);
  }

  @Put('equipment/:equipmentId')
  @ApiOperation({
    summary:
      'Perbarui fuel calibration by equipment_id (hapus semua lalu create ulang)',
  })
  updateByEquipment(
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Body() dto: CreateFuelCalibrationDto,
    @GetUser('userId') userId: string,
  ) {
    return this.fuelCalibrationsService.updateByEquipment(
      { ...dto, equipment_id: equipmentId },
      userId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar fuel calibration',
  })
  findAll(@Query() query: QueryFuelCalibrationDto) {
    return this.fuelCalibrationsService.findAll(query);
  }

  @Get('lookup')
  @ApiOperation({
    summary: 'Konversi nilai LLS menjadi Volume menggunakan interpolasi linear',
  })
  @ApiQuery({
    name: 'equipment_id',
    type: String,
    required: true,
    description: 'UUID Equipment',
  })
  @ApiQuery({
    name: 'lls',
    type: Number,
    required: true,
    description: 'Nilai LLS dari sensor',
  })
  lookup(
    @Query('equipment_id', ParseUUIDPipe)
    equipmentId: string,

    @Query('lls', ParseFloatPipe)
    lls: number,
  ) {
    return this.fuelCalibrationsService.lookupVolume(equipmentId, lls);
  }

  @Get('group-by-equipment')
  @ApiOperation({
    summary:
      'List fuel calibration group by equipment_id dengan nilai max fuel_level & fuel_volume',
  })
  @ApiQuery({
    name: 'equipment_id',
    type: String,
    required: false,
    description: 'UUID Equipment (opsional)',
  })
  groupByEquipment(@Query('equipment_id') equipmentId?: string) {
    return this.fuelCalibrationsService.groupByEquipment(equipmentId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Mengambil detail fuel calibration',
  })
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.fuelCalibrationsService.findOne(BigInt(id));
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Memperbarui fuel calibration',
  })
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateFuelCalibrationDto,

    @GetUser('userId')
    userId: string,
  ) {
    return this.fuelCalibrationsService.update(BigInt(id), dto, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Menghapus fuel calibration',
  })
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.fuelCalibrationsService.remove(BigInt(id));
  }

  @Delete('equipment/:equipmentId')
  @ApiOperation({
    summary: 'Menghapus seluruh fuel calibration berdasarkan equipment_id',
  })
  removeByEquipment(
    @Param('equipmentId', ParseUUIDPipe)
    equipmentId: string,
  ) {
    return this.fuelCalibrationsService.removeByEquipment(equipmentId);
  }
}
