import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './repositories/companies.repository';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository],
  exports: [CompaniesService], // Di-export agar modul Project nanti bisa melakukan validasi existensi Company
})
export class CompaniesModule {}
