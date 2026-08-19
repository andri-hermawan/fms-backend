import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EquipmentLogsService } from './equipment-logs.service';
import { CreateEquipmentLogDto } from './dto/create-equipment-log.dto';
import { QueryEquipmentLogDto } from './dto/query-equipment-log.dto';
import { ActivitySummaryQueryDto } from './dto/activity-summary.dto';
import { QueryByDateShiftDto } from './dto/query-by-date-shift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueryByEquipmentDateShiftDto } from './dto/query-by-equipment-date-shift.dto';

@ApiTags('Equipment Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment-logs')
export class EquipmentLogsController {
  constructor(private readonly service: EquipmentLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Create manual log (Testing purposes)' })
  create(@Body() dto: CreateEquipmentLogDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get logs with filter and pagination' })
  findAll(@Query() query: QueryEquipmentLogDto) {
    return this.service.findAll(query);
  }

  @Get('activity_summary')
  @ApiOperation({ summary: 'Get activity summary for tracking page' })
  getActivitySummary(@Query() query: ActivitySummaryQueryDto) {
    return this.service.getActivitySummary(query);
  }

  @Get('by-equipment-date-shift')
  @ApiOperation({
    summary:
      'Get logs by created_at, equipment_code, and shift (includes alerts)',
  })
  findByEquipmentDateShift(@Query() query: QueryByEquipmentDateShiftDto) {
    return this.service.findByEquipmentDateShift(query);
  }

  @Get('by-date-shift')
  @ApiOperation({
    summary: 'Get logs by created_at and shift (includes alerts)',
  })
  findByDateShift(@Query() query: QueryByDateShiftDto) {
    return this.service.findByDateShift(query);
  }

  @Get('segment-speed-summary')
  @ApiOperation({
    summary:
      'Get segment-wise average speed grouped by vessel_status (EMPTY vs LOADED), filterable by date and shift',
  })
  getSegmentSpeedSummary(@Query() query: QueryByDateShiftDto) {
    return this.service.getSegmentSpeedSummary(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detail log by BigInt ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
