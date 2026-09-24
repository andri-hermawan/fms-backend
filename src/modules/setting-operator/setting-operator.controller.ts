import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingOperatorService } from './setting-operator.service';
import { CreateSettingOperatorDto } from './dto/create-setting-operator.dto';
import type { Express } from 'express';
import { UpdateSettingOperatorDto } from './dto/update-setting-operator.dto';
import { QuerySettingOperatorDto } from './dto/query-setting-operator.dto';
import { QueryOperatorNameDto } from './dto/query-operator-name.dto';

@ApiTags('Setting Operator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('setting-operator')
export class SettingOperatorController {
  constructor(
    private readonly settingOperatorService: SettingOperatorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Membuat setting operator baru' })
  @ApiResponse({
    status: 201,
    description: 'Setting operator berhasil dibuat.',
  })
  create(@Body() dto: CreateSettingOperatorDto) {
    return this.settingOperatorService.create(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import setting operator dari file Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.settingOperatorService.importExcel(file);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil daftar setting operator' })
  findAll(@Query() query: QuerySettingOperatorDto) {
    return this.settingOperatorService.findAll(query);
  }

  @Get('operator-name/:equipmentId')
  @ApiOperation({
    summary: 'Mengambil operator_name berdasarkan date, equipment_id, dan shift',
    description:
      'equipment_id di-join lewat equipments.equipment_code -> daily_setting_operator.equipment_code. ' +
      'Filter date dan shift diterapkan pada tabel daily_setting_operator.',
  })
  @ApiParam({
    name: 'equipmentId',
    description: 'ID (uuid) dari equipments',
    example: '6f1b3d4e-2c5a-4b8f-9d1e-7a3c5b8e9f01',
  })
  findOperatorNameByEquipmentID(
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Query() query: QueryOperatorNameDto,
  ) {
    return this.settingOperatorService.findOperatorNameByEquipmentID({
      date: query.date,
      equipment_id: equipmentId,
      shift: query.shift,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil setting operator berdasarkan id' })
  findOne(@Param('id') id: string) {
    return this.settingOperatorService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mengupdate setting operator' })
  update(@Param('id') id: string, @Body() dto: UpdateSettingOperatorDto) {
    return this.settingOperatorService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus setting operator' })
  remove(@Param('id') id: string) {
    return this.settingOperatorService.remove(id);
  }
}
