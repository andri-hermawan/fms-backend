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
import { AttributeGeoService } from './attribute-geo.service';
import { CreateAttributeGeoDto } from './dto/create-attribute-geo.dto';
import { UpdateAttributeGeoDto } from './dto/update-attribute-geo.dto';
import { QueryAttributeGeoDto } from './dto/query-attribute-geo.dto';

@ApiTags('Attribute Geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attribute-geo')
export class AttributeGeoController {
  constructor(private readonly attributeGeoService: AttributeGeoService) {}

  @Post()
  @ApiOperation({ summary: 'Mendaftarkan data atribut geo baru' })
  @ApiResponse({ status: 201, description: 'Atribut geo berhasil dibuat.' })
  create(@Body() createAttributeGeoDto: CreateAttributeGeoDto) {
    return this.attributeGeoService.create(createAttributeGeoDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar atribut geo dengan filter & pagination',
  })
  findAll(@Query() query: QueryAttributeGeoDto) {
    return this.attributeGeoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Mengambil detail atribut geo berdasarkan ID (UUID)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.attributeGeoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data atribut geo' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttributeGeoDto: UpdateAttributeGeoDto,
  ) {
    return this.attributeGeoService.update(id, updateAttributeGeoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data atribut geo' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.attributeGeoService.remove(id);
  }
}
