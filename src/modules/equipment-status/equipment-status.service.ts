import { Injectable } from '@nestjs/common';
import { EquipmentStatusRepository } from './repositories/equipment-status.repository';

@Injectable()
export class EquipmentStatusService {
  constructor(private readonly repository: EquipmentStatusRepository) {}

  async findAll() {
    const data = (await this.repository.findAll()) as any[];

    return data.map((item) => ({
      equipment_id: item.equipment_id,

      equipment_code: item.equipment_code,
      equipment_alias: item.equipment_alias,

      latitude: Number(item.latitude),
      longitude: Number(item.longitude),

      speed: Number(item.speed ?? 0),
      heading: Number(item.heading ?? 0),
      altitude: Number(item.altitude ?? 0),

      fuel_level: Number(item.fuel_level ?? 0),
      fuel_temperature: Number(item.fuel_temperature ?? 0),
      fuel_volume: Number(item.fuel_volume ?? 0),
      fuel_percentage: Number(item.fuel_percentage ?? 0),
      fuel_difference: Number(item.fuel_difference ?? 0),
      alert_count: Number(item.alert_count ?? 0),

      ignition: Boolean(item.engine_status),

      // movement_status:
      //   item.status === 'MOVING'
      //     ? 'moving'
      //     : item.status === 'IDLE'
      //       ? 'idle'
      //       : 'stopped',

      status: item.status,
      recorded_at: item.updated_at,

      log_id: item.log_id?.toString(),
      updated_at: item.updated_at,

      is_inside: item.is_inside,
      location_category: item.location_category,
      segment: item.segment,

      vessel: item.vessel,
      mileage: item.mileage,
      vessel_status: item.vessel_status,
      engine_status: item.engine_status,
      breakdown: item.breakdown,
      gsm_signal: item.gsm_signal,
    }));
  }

  async updateStatus(dto: any) {
    return await this.repository.upsertStatus(dto);
  }

  async incrementAlertCount(equipmentId: string, amount: number) {
    return this.repository.incrementAlertCount(equipmentId, amount);
  }
}
