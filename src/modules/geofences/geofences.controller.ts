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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeofencesService } from './geofences.service';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { QueryGeofenceDto } from './dto/query-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';

@ApiTags('Geofences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geofences')
export class GeofencesController {
  constructor(private readonly service: GeofencesService) {}

  // @Post()
  // @ApiOperation({ summary: 'Trigger geofence baru' })
  // create(@Body() dto: CreateGeofenceDto, @GetUser('userId') userId: string) {
  //   return this.service.create(dto, userId);
  // }

  @Post()
  @ApiOperation({ summary: 'Trigger geofence baru' })
  create(@Body() dto: CreateGeofenceDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar geofence dengan filter & pagination',
  })
  findAll(@Query() query: QueryGeofenceDto) {
    return this.service.findAll(query);
  }

  @Get('passing')
  @ApiOperation({
    summary: 'Equipment Passing',
  })
  passing(@Query() query: QueryGeofenceDto) {
    return this.service.getPassing(query);
  }

  @Get('passing_summary')
  @ApiOperation({
    summary: 'Hourly Passing Summary',
  })
  passingSummary(@Query() query: QueryGeofenceDto) {
    return this.service.getPassingSummary(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Mendapatkan detail geofence berdasarkan ID',
  })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui data geofence' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGeofenceDto,
    @GetUser('userId') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus geofence' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
