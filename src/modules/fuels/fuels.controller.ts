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
import { FuelsService } from './fuels.service';
import { CreateFuelDto } from './dto/create-fuel.dto';
import { QueryFuelDto } from './dto/query-fuel.dto';
import { UpdateFuelDto } from './dto/update-fuel.dto';

@ApiTags('Fuels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fuels')
export class FuelsController {
  constructor(private readonly service: FuelsService) {}

  @Post()
  @ApiOperation({ summary: 'Trigger fuel baru' })
  create(@Body() dto: CreateFuelDto, @GetUser('userId') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Mengambil daftar fuel dengan filter & pagination',
  })
  findAll(@Query() query: QueryFuelDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail fuel berdasarkan ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui data fuel' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFuelDto,
    @GetUser('userId') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus fuel' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
