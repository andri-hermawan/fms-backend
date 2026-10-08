import { Module } from '@nestjs/common';
import { EquipmentLogsService } from './equipment-logs.service';
import { EquipmentLogsController } from './equipment-logs.controller';
import { EquipmentLogsRepository } from './repositories/equipment-logs.repository';
import { TeltonikaParserService } from './teltonika-parser.service';
import { TeltonikaTcpService } from './teltonika-tcp.service';
import { TelemetryIngestService } from './telemetry/telemetry-ingest.service';
import { EquipmentSnapshotService } from './telemetry/equipment-snapshot.service';
import { GeofenceEventService } from './geofence-events/geofence-event.service';
import { AlertDispatcherService } from './alert-detectors/alert-dispatcher.service';
import { OffTrackDetector } from './alert-detectors/off-track.detector';
import { SpeedDetector } from './alert-detectors/speed.detector';
import { FuelDetector } from './alert-detectors/fuel.detector';
import { DevicesModule } from '../devices/devices.module';
import { EquipmentStatusModule } from '../equipment-status/equipment-status.module';
import { EquipmentsModule } from '../equipments/equipments.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AlertRulesModule } from '../alert-rules/alert-rules.module';
import { FuelsModule } from '../fuels/fuels.module';
import { FuelCalibrationsModule } from '../fuel-calibrations/fuel-calibrations.module';
import { GeofencesModule } from '../geofences/geofences.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { SettingOperatorModule } from '../setting-operator/setting-operator.module';
import { BreakdownStatusModule } from '../breakdown-status/breakdown-status.module';

@Module({
  imports: [
    DevicesModule,
    EquipmentStatusModule,
    EquipmentsModule,
    AlertsModule,
    AlertRulesModule,
    FuelsModule,
    FuelCalibrationsModule,
    GeofencesModule,
    ShiftsModule,
    SettingOperatorModule,
    BreakdownStatusModule,
  ],
  controllers: [EquipmentLogsController],
  providers: [
    EquipmentLogsService,
    EquipmentLogsRepository,
    TeltonikaParserService,
    TeltonikaTcpService,
    // Pipeline telemetry
    TelemetryIngestService,
    EquipmentSnapshotService,
    GeofenceEventService,
    // Alert detectors
    AlertDispatcherService,
    OffTrackDetector,
    SpeedDetector,
    FuelDetector,
  ],
  exports: [EquipmentLogsService],
})
export class EquipmentLogsModule {}
