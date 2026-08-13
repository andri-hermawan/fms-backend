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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Projects') // Menyatukan endpoint ini di grup "Projects" pada Swagger UI
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('geojson_origin')) // Menangkap file dari field 'geojson_origin'
  @ApiOperation({
    summary: 'Mendaftarkan proyek baru (Mendukung upload file GeoJSON)',
  })
  @ApiConsumes('multipart/form-data', 'application/json') // Memberitahu Swagger bahwa endpoint ini menerima form-data
  @ApiResponse({ status: 201, description: 'Proyek berhasil dibuat.' })
  @ApiResponse({ status: 400, description: 'Format file GeoJSON tidak valid.' })
  @ApiResponse({ status: 404, description: 'Company ID tidak ditemukan.' })
  @ApiResponse({ status: 409, description: 'Project code sudah digunakan.' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @UploadedFile() file?: Express.Multer.File, // Pastikan @types/multer sudah diinstall
  ) {
    // Jika ada file yang diunggah, timpa isi geojson_origin di DTO
    if (file) {
      try {
        // Konversi buffer file menjadi string lalu parse ke JSON object
        const fileContent = file.buffer.toString('utf-8');
        createProjectDto.geojson_origin = JSON.parse(fileContent);
      } catch {
        // SOLUSI: Menggunakan Optional Catch Binding (tanpa variabel error)
        throw new BadRequestException(
          'Format file GeoJSON tidak valid (bukan format JSON yang benar)',
        );
      }
    }

    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar proyek dengan filter & pagination',
  })
  findAll(@Query() query: QueryProjectDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil detail proyek berdasarkan ID (UUID)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('geojson_origin'))
  @ApiOperation({
    summary: 'Memperbarui data proyek (Mendukung update file GeoJSON)',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  update(
    @Param('id', ParseUUIDPipe)
    id: string,

    @Body()
    updateProjectDto: UpdateProjectDto,

    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    if (file) {
      try {
        const fileContent = file.buffer.toString('utf-8');

        updateProjectDto.geojson_origin = JSON.parse(fileContent);
      } catch {
        throw new BadRequestException(
          'Format file GeoJSON tidak valid (bukan format JSON yang benar)',
        );
      }
    }

    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data proyek' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id);
  }
}
