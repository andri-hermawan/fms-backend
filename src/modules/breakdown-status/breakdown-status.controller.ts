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
  ApiOkResponse,
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
import { QueryBreakdownStatusDailyDto } from './dto/query-breakdown-status-daily.dto';
import { GetUser } from '../../core/decorators/get-user.decorator';

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
  create(
    @Body() dto: CreateBreakdownStatusDto,
    @GetUser('name') name: string | null,
  ) {
    return this.breakdownStatusService.create(dto, name);
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
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @GetUser('name') name: string | null,
  ) {
    return this.breakdownStatusService.importExcel(file, name);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil daftar breakdown status' })
  findAll(@Query() query: QueryBreakdownStatusDto) {
    return this.breakdownStatusService.findAll(query);
  }

  @Get('daily')
  @ApiOperation({
    summary:
      'Report breakdown duration harian per asset (group by date_at & equipment_code)',
    description:
      'Menghasilkan matrix Asset ID x tanggal. Nilai tiap sel adalah total durasi breakdown ' +
      '(SUM kolom duration, dalam jam) untuk equipment_code tersebut pada tanggal tersebut, ' +
      'setara dengan SUMIFS(Input_BD!$I:$I; Input_BD!$M:$M; asset; Input_BD!$A:$A; tanggal) ' +
      'pada Excel. Kondisi OR(DT_RMKO!O4="";DT_RMKO!O4="Non Active") pada rumus aslinya ' +
      'tidak dipakai. Tanggal tanpa data breakdown bernilai 0. Filter yang tersedia hanya ' +
      'shift dan equipment_code, keduanya mendukung lebih dari satu nilai.',
  })
  @ApiOkResponse({
    description: 'Report breakdown duration harian berhasil diambil.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Success',
        data: {
          period: {
            start_date: '2026-09-01',
            end_date: '2026-09-07',
            total_days: 7,
          },
          days: [
            '2026-09-01',
            '2026-09-02',
            '2026-09-03',
            '2026-09-04',
            '2026-09-05',
            '2026-09-06',
            '2026-09-07',
          ],
          filters: { shift: ['Shift 1'], equipment_code: ['DT10193'] },
          data: [
            {
              asset_id: 'DT10193',
              equipment_code: 'DT10193',
              values: {
                '2026-09-01': 0.73,
                '2026-09-02': 14.5,
                '2026-09-03': 8.68,
                '2026-09-04': 3.08,
                '2026-09-05': 18.83,
                '2026-09-06': 8,
                '2026-09-07': 0,
              },
            },
          ],
          total_row: 1,
        },
      },
    },
  })
  getDaily(@Query() query: QueryBreakdownStatusDailyDto) {
    return this.breakdownStatusService.getBreakdownDaily(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil breakdown status berdasarkan id' })
  findOne(@Param('id') id: string) {
    return this.breakdownStatusService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mengupdate breakdown status' })
  @ApiBody({
    type: UpdateBreakdownStatusDto,
    examples: {
      updateBreakdownStatus: {
        summary: 'Contoh update breakdown status',
        value: {
          date_at: '2026-08-11',
          shift: 'SHIFT 1',
          equipment_code: 'TR-001',
          status: 'DOWN',
          category: 'MESIN',
          time_start: '08:00',
          time_end: '10:30',
          duration: 2.5,
          repair_status: 'PENDING',
          description: 'Kerusakan mesin',
          location: 'Site A',
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBreakdownStatusDto,
    @GetUser('name') name: string | null,
  ) {
    return this.breakdownStatusService.update(id, dto, name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus breakdown status' })
  remove(@Param('id') id: string) {
    return this.breakdownStatusService.remove(id);
  }
}
