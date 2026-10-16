import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './core/database/database.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EquipmentsModule } from './modules/equipments/equipments.module';
import { DevicesModule } from './modules/devices/devices.module';
import { EquipmentLogsModule } from './modules/equipment-logs/equipment-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { AlertCategoriesModule } from './modules/alert-categories/alert-categories.module';
import { AlertRulesModule } from './modules/alert-rules/alert-rules.module';
import { AttributeGeoModule } from './modules/attribute-geo/attribute-geo.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { GeofencesModule } from './modules/geofences/geofences.module';
import { FuelsModule } from './modules/fuels/fuels.module';
import { EquipmentStatusModule } from './modules/equipment-status/equipment-status.module';
import { AppController } from './app.controller';
import { FuelCalibrationsModule } from './modules/fuel-calibrations/fuel-calibrations.module';
import { WebSocketModule } from './common/websocket/websocket.module';
import { SettingOperatorModule } from './modules/setting-operator/setting-operator.module';
import { BreakdownStatusModule } from './modules/breakdown-status/breakdown-status.module';
import { WeighbridgeModule } from './modules/weighbridge/weighbridge.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportSchedulesModule } from './modules/report-schedules/report-schedules.module';
import { EquipmentActivationModule } from './modules/equipment-activation/equipment-activation.module';

@Module({
  imports: [
    // Setup Global Config Module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'staging')
          .default('development'),
        PORT: Joi.number().default(3346),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('1d'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        CORS_ORIGIN: Joi.string().optional(),
        TELTONIKA_TCP_PORT: Joi.number().default(5550),
        // Pengiriman report via email; dikosongkan = fitur kirim belum aktif.
        SMTP_HOST: Joi.string().allow('').optional(),
        SMTP_PORT: Joi.number().default(587),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_USER: Joi.string().allow('').optional(),
        SMTP_PASS: Joi.string().allow('').optional(),
        MAIL_FROM: Joi.string().allow('').optional(),
        FRONTEND_URL: Joi.string().allow('').optional(),
        PUPPETEER_EXECUTABLE_PATH: Joi.string().allow('').optional(),
        // Notifikasi WA alert; dikosongkan = alert hanya tersimpan di database.
        WHATSAPP_API_URL: Joi.string().allow('').optional(),
        WHATSAPP_TIMEOUT_MS: Joi.number().default(10000),
      }),
    }),
    // Rate Limiting: 100 request / menit per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    // Core Modules
    WebSocketModule,
    DatabaseModule,
    AuthModule,
    CompaniesModule,
    ProjectsModule,
    UsersModule,
    EquipmentsModule,
    DevicesModule,
    AlertCategoriesModule,
    AlertRulesModule,
    AttributeGeoModule,
    ShiftsModule,
    EquipmentLogsModule,
    AlertsModule,
    GeofencesModule,
    FuelsModule,
    EquipmentStatusModule,
    FuelCalibrationsModule,
    SettingOperatorModule,
    BreakdownStatusModule,
    WeighbridgeModule,
    ReportSchedulesModule,
    EquipmentActivationModule,
    // Nanti module seperti Companies, Users, dll akan masuk ke sini
  ],
  controllers: [AppController], // Registrasikan AppController di sini
  providers: [],
})
export class AppModule {}
