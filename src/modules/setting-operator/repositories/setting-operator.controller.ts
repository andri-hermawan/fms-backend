import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SettingOperatorService } from './setting-operator.service';
import { CreateSettingOperatorDto } from '../dto/create-setting-operator.dto';
import type { Express } from 'express';
import { UpdateSettingOperatorDto } from '../dto/update-setting-operator.dto';
import { QuerySettingOperatorDto } from '../dto/query-setting-operator.dto';

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
