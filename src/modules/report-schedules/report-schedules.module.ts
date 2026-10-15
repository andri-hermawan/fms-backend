import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ReportSchedulesController } from './report-schedules.controller';
import { ReportSchedulesService } from './report-schedules.service';
import { ReportSchedulesRepository } from './repositories/report-schedules.repository';
import { ReportSchedulesScheduler } from './report-schedules.scheduler';
import { ReportPdfService } from './report-pdf.service';
import { ReportMailerService } from './report-mailer.service';

@Module({
  imports: [
    // Menandatangani token sementara untuk headless browser saat render PDF.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [ReportSchedulesController],
  providers: [
    ReportSchedulesService,
    ReportSchedulesRepository,
    ReportSchedulesScheduler,
    ReportPdfService,
    ReportMailerService,
  ],
})
export class ReportSchedulesModule {}
