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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeighbridgeService } from './weighbridge.service';
import { CreateWeighbridgeDto } from './dto/create-weighbridge.dto';
import type { Express } from 'express';
import { UpdateWeighbridgeDto } from './dto/update-weighbridge.dto';
import { QueryWeighbridgeDto } from './dto/query-weighbridge.dto';

@ApiTags('Weighbridge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('weighbridge')
export class WeighbridgeController {
  constructor(private readonly weighbridgeService: WeighbridgeService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat weighbridge baru' })
  @ApiResponse({
    status: 201,
    description: 'Weighbridge berhasil dibuat.',
  })
  create(@Body() dto: CreateWeighbridgeDto) {
    return this.weighbridgeService.create(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import weighbridge dari file Excel' })
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
    return this.weighbridgeService.importExcel(file);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil daftar weighbridge' })
  findAll(@Query() query: QueryWeighbridgeDto) {
    return this.weighbridgeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil weighbridge berdasarkan id' })
  findOne(@Param('id') id: string) {
    return this.weighbridgeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mengupdate weighbridge' })
  update(@Param('id') id: string, @Body() dto: UpdateWeighbridgeDto) {
    return this.weighbridgeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus weighbridge' })
  remove(@Param('id') id: string) {
    return this.weighbridgeService.remove(id);
  }
}