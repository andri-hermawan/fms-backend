import { Injectable } from '@nestjs/common';
import { GeofencesService } from '../../geofences/geofences.service';
import { WebSocketGatewayService } from '../../../common/websocket/websocket.gateway';
import { CreateEquipmentLogDto } from '../dto/create-equipment-log.dto';
import { GeofenceLocation } from '../telemetry/calculators/geofence-locator';
import { LastLog, SavedLog } from '../telemetry/telemetry-context';

export interface GeofenceTransitionParams {
  dto: CreateEquipmentLogDto;
  equipmentCode: string | null | undefined;
  lastLog: LastLog | null;
  savedLog: SavedLog;
  location: GeofenceLocation;
  shiftName: string | null;
}

// Mencatat event geofence IN / OUT ketika unit berpindah segment.
@Injectable()
export class GeofenceEventService {
  constructor(
    private readonly geofenceService: GeofencesService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  async pushTransitionEvents({
    dto,
    equipmentCode,
    lastLog,
    savedLog,
    location,
    shiftName,
  }: GeofenceTransitionParams) {
    const {
      longitude,
      latitude,
      speed,
      fuel_level,
      engine_status,
      created_at,
    } = dto;
    const { segmentName, categoryLocation, isInside, origFid } = location;

    const previousOrigFid = Number(lastLog?.orig_fid) || 0;
    const currentOrigFid = Number(origFid) || 0;
    const hasValidSegment = segmentName !== 'Unknown';
    const lastGeofence = await this.geofenceService.findLatestByEquipment(
      dto.equipment_id!,
    );
    const shouldCreateIn =
      hasValidSegment &&
      currentOrigFid === 0 &&
      lastGeofence?.event === 'OUT' &&
      lastGeofence.segment !== segmentName;
    const shouldCreateOut =
      hasValidSegment &&
      ((currentOrigFid === 0 && !lastGeofence) ||
        (previousOrigFid === 0 &&
          currentOrigFid !== 0 &&
          lastGeofence?.event === 'IN'));

    // Field yang sama untuk event IN maupun OUT.
    const baseEvent = {
      equipment_id: dto.equipment_id,
      log_id: savedLog.id,
      alert_category: 'GEOFENCING',
      is_alert: false,
      description: '',
      longitude,
      latitude,
      speed,
      fuel_level,
      vessel: savedLog.vessel,
      mileage: savedLog.mileage,
      vessel_status: savedLog.vessel_status,
      engine_status,
      shift: shiftName,
      created_at: savedLog.created_at?.toISOString() ?? undefined,
    };

    if (shouldCreateOut) {
      const segment = lastLog?.segment ?? segmentName;
      const newGeofence = await this.geofenceService.create({
        ...baseEvent,
        event: 'OUT',
        is_inside: lastLog?.is_inside ?? isInside,
        orig_fid: lastLog?.orig_fid ?? origFid,
        location_category: lastLog?.category_location ?? categoryLocation,
        segment,
      });
      this.emit('OUT', segment, dto, equipmentCode, created_at, newGeofence);
    }

    if (shouldCreateIn) {
      const newGeofence = await this.geofenceService.create({
        ...baseEvent,
        event: 'IN',
        is_inside: savedLog.is_inside,
        orig_fid: savedLog.orig_fid,
        location_category: savedLog.category_location,
        segment: savedLog.segment,
      });
      this.emit(
        'IN',
        savedLog.segment,
        dto,
        equipmentCode,
        created_at,
        newGeofence,
      );
    }
  }

  private emit(
    event: 'IN' | 'OUT',
    segment: string | null,
    dto: CreateEquipmentLogDto,
    equipmentCode: string | null | undefined,
    createdAt: string | undefined,
    newGeofence: unknown,
  ) {
    this.wsGateway.emitGeofenceEvent({
      equipment_id: dto.equipment_id,
      equipment_code: equipmentCode,
      event,
      segment,
      longitude: dto.longitude,
      latitude: dto.latitude,
      created_at: createdAt || undefined,
    });
    this.wsGateway.emitNewGeofence(newGeofence);
  }
}
