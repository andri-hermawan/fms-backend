import { Injectable } from '@nestjs/common';
import { EquipmentStatusRepository } from './repositories/equipment-status.repository';

@Injectable()
export class EquipmentStatusService {
  constructor(private readonly repository: EquipmentStatusRepository) {}

  async findAll() {
    const data = await this.repository.findAll();
    // Konversi BigInt ke String agar aman di JSON
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  async updateStatus(dto: any) {
    return await this.repository.upsertStatus(dto);
  }
}
