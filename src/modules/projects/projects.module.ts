import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './repositories/projects.repository';
import { CompaniesModule } from '../companies/companies.module'; // Import CompaniesModule

@Module({
  imports: [CompaniesModule], // Daftarkan di sini
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService],
})
export class ProjectsModule {}
