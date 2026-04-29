import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
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
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { GeofencesModule } from './modules/geofences/geofences.module';
import { FuelsModule } from './modules/fuels/fuels.module';
import { EquipmentStatusModule } from './modules/equipment-status/equipment-status.module';

@Module({
  imports: [
    // Setup Global Config Module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
      }),
    }),
    // Core Modules
    DatabaseModule,
    AuthModule,
    CompaniesModule,
    ProjectsModule,
    UsersModule,
    EquipmentsModule,
    DevicesModule,
    AlertCategoriesModule,
    ShiftsModule,
    EquipmentLogsModule,
    AlertsModule,
    GeofencesModule,
    FuelsModule,
    EquipmentStatusModule,
    // Nanti module seperti Companies, Users, dll akan masuk ke sini
  ],
})
export class AppModule {}
