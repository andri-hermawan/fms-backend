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
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../core/decorators/get-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Mendaftarkan perangkat/device baru' })
  @ApiResponse({ status: 201, description: 'Device berhasil didaftarkan.' })
  @ApiResponse({ status: 409, description: 'Device code sudah digunakan.' })
  create(@Body() dto: CreateDeviceDto, @GetUser('userId') userId: string) {
    return this.devicesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar device dengan filter & pagination',
  })
  findAll(@Query() query: QueryDeviceDto) {
    return this.devicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail device berdasarkan ID' })
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui data device' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
    @GetUser('userId') userId: string,
  ) {
    return this.devicesService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data device' })
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }
}
