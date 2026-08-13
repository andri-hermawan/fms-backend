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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { QueryShiftDto } from './dto/query-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@ApiTags('Shifts') // Mengelompokkan endpoint di Swagger UI
@ApiBearerAuth() // Memunculkan tombol gembok di Swagger
@UseGuards(JwtAuthGuard) // Mengunci seluruh controller
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @ApiOperation({ summary: 'Mendaftarkan shift baru' })
  @ApiResponse({ status: 201, description: 'Shift berhasil dibuat.' })
  @ApiResponse({ status: 409, description: 'Shift code sudah digunakan.' })
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar shift beserta fitur filter & pagination',
  })
  findAll(@Query() query: QueryShiftDto) {
    return this.shiftsService.findAll(query);
  }

  @Get('current/project/:projectId')
  @ApiOperation({
    summary: 'Mengecek shift aktif berdasarkan project dan jam sekarang',
  })
  @ApiQuery({
    name: 'time',
    required: false,
    description: 'Waktu pengecekan (format HH:mm atau HH:mm:ss)',
    example: '09:00',
  })
  findCurrentByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('time') time?: string,
  ) {
    return this.shiftsService.findCurrentByProject(projectId, time);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Mengambil detail shift berdasarkan ID (UUID)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data shift' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data shift' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.remove(id);
  }
}
