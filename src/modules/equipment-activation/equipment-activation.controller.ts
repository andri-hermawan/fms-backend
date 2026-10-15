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
import type { Express } from 'express';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEquipmentActivationDto } from './dto/create-equipment-activation.dto';
import { QueryEquipmentActivationDto } from './dto/query-equipment-activation.dto';
import { UpdateEquipmentActivationDto } from './dto/update-equipment-activation.dto';
import { EquipmentActivationService } from './equipment-activation.service';

@ApiTags('Equipment Activation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment-activation')
export class EquipmentActivationController {
  constructor(
    private readonly equipmentActivationService: EquipmentActivationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Membuat equipment activation baru' })
  @ApiResponse({
    status: 201,
    description: 'Equipment activation berhasil dibuat.',
  })
  create(
    @Body() dto: CreateEquipmentActivationDto,
    @GetUser('name') name: string | null,
  ) {
    return this.equipmentActivationService.create(dto, name);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import equipment activation dari file Excel' })
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
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @GetUser('name') name: string | null,
  ) {
    return this.equipmentActivationService.importExcel(file, name);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil daftar equipment activation' })
  findAll(@Query() query: QueryEquipmentActivationDto) {
    return this.equipmentActivationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil equipment activation berdasarkan id' })
  findOne(@Param('id') id: string) {
    return this.equipmentActivationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mengupdate equipment activation' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentActivationDto,
    @GetUser('name') name: string | null,
  ) {
    return this.equipmentActivationService.update(id, dto, name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus equipment activation' })
  remove(@Param('id') id: string) {
    return this.equipmentActivationService.remove(id);
  }
}
