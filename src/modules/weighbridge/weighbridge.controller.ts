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
import { WeighbridgeService } from './weighbridge.service';
import { CreateWeighbridgeDto } from './dto/create-weighbridge.dto';
import type { Express } from 'express';
import { UpdateWeighbridgeDto } from './dto/update-weighbridge.dto';
import { QueryWeighbridgeDto } from './dto/query-weighbridge.dto';
import { QueryWeighbridgeRitaseDailyDto } from './dto/query-weighbridge-ritase-daily.dto';
import { QueryWeighbridgePayloadDailyDto } from './dto/query-weighbridge-payload-daily.dto';
import { QueryWeighbridgeProductionDailyDto } from './dto/query-weighbridge-production-daily.dto';
import { GetUser } from '../../core/decorators/get-user.decorator';

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
  create(
    @Body() dto: CreateWeighbridgeDto,
    @GetUser('name') name: string | null,
  ) {
    return this.weighbridgeService.create(dto, name);
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
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @GetUser('name') name: string | null,
  ) {
    return this.weighbridgeService.importExcel(file, name);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil daftar weighbridge' })
  findAll(@Query() query: QueryWeighbridgeDto) {
    return this.weighbridgeService.findAll(query);
  }

  @Get('ritase-daily')
  @ApiOperation({
    summary:
      'Report ritase harian per asset (group by date_at & equipment_code)',
    description:
      'Menghasilkan matrix Asset ID x tanggal. Nilai tiap sel adalah jumlah ritase ' +
      '(COUNT baris weighbridge) untuk equipment_code tersebut pada tanggal tersebut, ' +
      'setara dengan COUNTIFS(Input_WB!D:D; asset; Input_WB!B:B; tanggal) pada Excel. ' +
      'Filter yang tersedia hanya shift dan equipment_code, keduanya mendukung lebih ' +
      'dari satu nilai.',
  })
  @ApiOkResponse({
    description: 'Report ritase harian berhasil diambil.',
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
          days: ['2026-09-01', '2026-09-02', '2026-09-03'],
          filters: { shift: null, equipment_code: ['DT10193'] },
          data: [
            {
              asset_id: 'DT10193',
              equipment_code: 'DT10193',
              ritase: 3,
              total_net: 81000,
              values: { '2026-09-01': 3, '2026-09-02': 2, '2026-09-03': 0 },
            },
          ],
          total_row: 1,
        },
      },
    },
  })
  getRitaseDaily(@Query() query: QueryWeighbridgeRitaseDailyDto) {
    return this.weighbridgeService.getRitaseDaily(query);
  }

  @Get('payload-daily')
  @ApiOperation({
    summary:
      'Report payload harian per asset (group by date_at & equipment_code)',
    description:
      'Menghasilkan matrix Asset ID x tanggal. Nilai tiap sel adalah rata-rata payload ' +
      '(kolom net) untuk equipment_code tersebut pada tanggal tersebut, dikonversi ke ton ' +
      '(dibagi 1000), setara dengan IFERROR(AVERAGEIFS(Input_WB!$J:$J; Input_WB!$P:$P; asset; ' +
      'Input_WB!$B:$B; tanggal)/1000; 0) pada Excel. Tanggal tanpa transaksi bernilai 0. ' +
      'Filter yang tersedia hanya shift dan equipment_code, keduanya mendukung lebih ' +
      'dari satu nilai.',
  })
  @ApiOkResponse({
    description: 'Report payload harian berhasil diambil.',
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
          days: ['2026-09-01', '2026-09-02', '2026-09-03'],
          filters: { shift: null, equipment_code: ['DT10193'] },
          data: [
            {
              asset_id: 'DT10193',
              equipment_code: 'DT10193',
              values: {
                '2026-09-01': 26.9,
                '2026-09-02': 26.36,
                '2026-09-03': 0,
              },
            },
          ],
          total_row: 1,
        },
      },
    },
  })
  getPayloadDaily(@Query() query: QueryWeighbridgePayloadDailyDto) {
    return this.weighbridgeService.getPayloadDaily(query);
  }

  @Get('production-daily')
  @ApiOperation({
    summary:
      'Report production harian per asset (group by date_at & equipment_code)',
    description:
      'Menghasilkan matrix Asset ID x tanggal. Nilai tiap sel adalah total payload ' +
      '(SUM kolom net) untuk equipment_code tersebut pada tanggal tersebut, dikonversi ke ton ' +
      '(dibagi 1000), setara dengan IFERROR(SUMIFS(Input_WB!$J:$J; Input_WB!$P:$P; asset; ' +
      'Input_WB!$B:$B; tanggal)/1000; 0) pada Excel. Tanggal tanpa transaksi bernilai 0. ' +
      'Filter yang tersedia hanya shift dan equipment_code, keduanya mendukung lebih ' +
      'dari satu nilai.',
  })
  @ApiOkResponse({
    description: 'Report production harian berhasil diambil.',
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
          days: ['2026-09-01', '2026-09-02', '2026-09-03'],
          filters: { shift: null, equipment_code: ['DT10193'] },
          data: [
            {
              asset_id: 'DT10193',
              equipment_code: 'DT10193',
              values: {
                '2026-09-01': 26.9,
                '2026-09-02': 52.72,
                '2026-09-03': 0,
              },
            },
          ],
          total_row: 1,
        },
      },
    },
  })
  getProductionDaily(@Query() query: QueryWeighbridgeProductionDailyDto) {
    return this.weighbridgeService.getProductionDaily(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil weighbridge berdasarkan id' })
  findOne(@Param('id') id: string) {
    return this.weighbridgeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mengupdate weighbridge' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWeighbridgeDto,
    @GetUser('name') name: string | null,
  ) {
    return this.weighbridgeService.update(id, dto, name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus weighbridge' })
  remove(@Param('id') id: string) {
    return this.weighbridgeService.remove(id);
  }
}
