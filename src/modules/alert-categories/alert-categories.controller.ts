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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertCategoriesService } from './alert-categories.service';
import { CreateAlertCategoryDto } from './dto/create-alert-category.dto';
import { QueryAlertCategoryDto } from './dto/query-alert-category.dto';
import { UpdateAlertCategoryDto } from './dto/update-alert-category.dto';

@ApiTags('Alert Categories') // Mengelompokkan endpoint di Swagger UI
@ApiBearerAuth() // Memunculkan tombol gembok di Swagger
@UseGuards(JwtAuthGuard) // Mengunci seluruh controller
@Controller('alert-categories')
export class AlertCategoriesController {
  constructor(
    private readonly alertCategoriesService: AlertCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Mendaftarkan alert category baru' })
  @ApiResponse({ status: 201, description: 'Alert category berhasil dibuat.' })
  @ApiResponse({
    status: 409,
    description: 'Alert category code sudah digunakan.',
  })
  create(@Body() createAlertCategoryDto: CreateAlertCategoryDto) {
    return this.alertCategoriesService.create(createAlertCategoryDto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Mengambil daftar alert category beserta fitur filter & pagination',
  })
  findAll(@Query() query: QueryAlertCategoryDto) {
    return this.alertCategoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Mengambil detail alert category berdasarkan ID (UUID)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertCategoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data alert category' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAlertCategoryDto: UpdateAlertCategoryDto,
  ) {
    return this.alertCategoriesService.update(id, updateAlertCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data alert category' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertCategoriesService.remove(id);
  }
}
