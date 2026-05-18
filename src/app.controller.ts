import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('System')
@Controller() // Kosongkan agar nempel ke fms/api/v1
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Check Server Status' })
  @ApiResponse({ status: 200, description: 'Server is healthy' })
  getHealth() {
    return {
      status: 'success',
      message: 'FMS Enterprise API Server is up and running',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()), // Dibulatkan agar tidak terlalu panjang
    };
  }
}
