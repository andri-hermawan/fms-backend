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
import { BreakdownStatusService } from './breakdown-status.service';
import { CreateBreakdownStatusDto } from './dto/create-breakdown-status.dto';
import type { Express } from 'express';
import { UpdateBreakdownStatusDto } from './dto/update-breakdown-status.dto';
import { QueryBreakdownStatusDto } from './dto/query-breakdown-status.dto';

@ApiTags('Breakdown Status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('breakdown-status')
export class BreakdownStatusController {
  constructor(
    private readonly breakdownStatusService: BreakdownStatusService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Membuat breakdown status baru' })
  @ApiResponse({
    status: 201,
    description: 'Breakdown status berhasil dibuat.',
  })
  create(@Body() dto: CreateBreakdownStatusDto) {
    return this.breakdownStatusService.create(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import breakdown status dari file Excel' })
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
    return this.breakdownStatusService.importExcel(file);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil daftar breakdown status' })
  findAll(@Query() query: QueryBreakdownStatusDto) {
    return this.breakdownStatusService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil breakdown status berdasarkan id' })
  findOne(@Param('id') id: string) {
    return this.breakdownStatusService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mengupdate breakdown status' })
  update(@Param('id') id: string, @Body() dto: UpdateBreakdownStatusDto) {
    return this.breakdownStatusService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus breakdown status' })
  remove(@Param('id') id: string) {
    return this.breakdownStatusService.remove(id);
  }
}