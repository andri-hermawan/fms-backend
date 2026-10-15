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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { ReportSchedulesService } from './report-schedules.service';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';
import { UpdateReportScheduleDto } from './dto/update-report-schedule.dto';
import { QueryReportScheduleDto } from './dto/query-report-schedule.dto';

@ApiTags('Report Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('report-schedules')
export class ReportSchedulesController {
  constructor(private readonly service: ReportSchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat jadwal pengiriman report' })
  create(
    @Body() dto: CreateReportScheduleDto,
    @GetUser('userId') userId: string | null,
  ) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar jadwal pengiriman report' })
  findAll(@Query() query: QueryReportScheduleDto) {
    return this.service.findAll(query);
  }

  // Didefinisikan sebelum ':id' agar 'types' tidak dianggap sebagai ID.
  @Get('types')
  @ApiOperation({ summary: 'Daftar report yang bisa dijadwalkan' })
  getReportTypes() {
    return this.service.getReportTypes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail jadwal' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Riwayat eksekusi jadwal' })
  findLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findLogs(id);
  }

  @Post(':id/send-now')
  @ApiOperation({ summary: 'Kirim report sekarang (uji coba jadwal)' })
  sendNow(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.sendNow(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui jadwal' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportScheduleDto,
    @GetUser('userId') userId: string | null,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus jadwal' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
