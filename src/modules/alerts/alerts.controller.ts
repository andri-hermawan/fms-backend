import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateAlertDto } from './dto/update-alert.dto';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  // @Post()
  // @ApiOperation({ summary: 'Trigger alert baru' })
  // create(@Body() dto: CreateAlertDto, @GetUser('userId') userId: string) {
  //   return this.service.create(dto, userId);
  // }

  @Post()
  @ApiOperation({ summary: 'Trigger alert baru' })
  create(@Body() dto: CreateAlertDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar alert dengan filter & pagination',
  })
  findAll(@Query() query: QueryAlertDto) {
    return this.service.findAll(query);
  }

  @Get('summary_by_category')
  async findAlertSummary(@Query() query: QueryAlertDto) {
    return this.service.findAlertSummary(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail alert berdasarkan ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Tandai alert sebagai telah dibaca (is_read = true)' })
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui data alert' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
    @GetUser('userId') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus alert' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
