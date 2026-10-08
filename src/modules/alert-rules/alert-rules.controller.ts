import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertRulesService } from './alert-rules.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { QueryAlertRuleDto } from './dto/query-alert-rule.dto';

@ApiTags('Alert Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly alertRulesService: AlertRulesService) {}

  @Post()
  @ApiOperation({
    summary: 'Membuat threshold alert (global / project / segment)',
  })
  create(@Body() dto: CreateAlertRuleDto) {
    return this.alertRulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil daftar threshold alert' })
  findAll(@Query() query: QueryAlertRuleDto) {
    return this.alertRulesService.findAll(query);
  }

  // Didefinisikan sebelum ':id' agar 'segments' tidak dianggap sebagai ID.
  @Get('segments')
  @ApiOperation({
    summary: 'Daftar segment project (attribute_geo) untuk rule per segment',
  })
  findSegments(@Query('project_id', ParseUUIDPipe) projectId: string) {
    return this.alertRulesService.findSegments(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil detail threshold alert' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertRulesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui threshold alert' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.alertRulesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus threshold alert' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertRulesService.remove(id);
  }
}
