import { Module } from '@nestjs/common';
import { AlertCategoriesRepository } from './repositories/alert-categories.repository';
import { AlertCategoriesController } from './alert-categories.controller';
import { AlertCategoriesService } from './alert-categories.service';

@Module({
  controllers: [AlertCategoriesController],
  providers: [AlertCategoriesService, AlertCategoriesRepository],
  exports: [AlertCategoriesService], // Di-export agar modul Project nanti bisa melakukan validasi existensi Company
})
export class AlertCategoriesModule {}
