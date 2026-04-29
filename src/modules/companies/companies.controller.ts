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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Companies') // Mengelompokkan endpoint di Swagger UI
@ApiBearerAuth() // Memunculkan tombol gembok di Swagger
@UseGuards(JwtAuthGuard) // Mengunci seluruh controller
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Mendaftarkan perusahaan baru' })
  @ApiResponse({ status: 201, description: 'Perusahaan berhasil dibuat.' })
  @ApiResponse({ status: 409, description: 'Company code sudah digunakan.' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar perusahaan beserta fitur filter & pagination',
  })
  findAll(@Query() query: QueryCompanyDto) {
    return this.companiesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Mengambil detail perusahaan berdasarkan ID (UUID)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data perusahaan' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data perusahaan' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.remove(id);
  }
}
