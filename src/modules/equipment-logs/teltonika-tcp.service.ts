import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as net from 'net';
import { TeltonikaParserService } from './teltonika-parser.service';
import { EquipmentLogsRepository } from './repositories/equipment-logs.repository';
import { DevicesRepository } from '../devices/repositories/devices.repository';
import { EquipmentStatusService } from '../equipment-status/equipment-status.service'; // Import service baru

@Injectable()
export class TeltonikaTcpService implements OnModuleInit, OnModuleDestroy {
  private server!: net.Server;
  private readonly PORT = 8888;

  constructor(
    private readonly parserService: TeltonikaParserService,
    private readonly logsRepository: EquipmentLogsRepository,
    private readonly devicesRepository: DevicesRepository,
    private readonly equipmentStatusService: EquipmentStatusService, // Inject di constructor
  ) {}

  onModuleInit() {
    this.startServer();
  }

  onModuleDestroy() {
    if (this.server) this.server.close();
  }

  private startServer() {
    this.server = net.createServer((socket) => {
      let imei: string = '';

      socket.on('data', (data) => {
        void (async () => {
          try {
            if (!imei) {
              imei = this.parserService.parseImei(data);
              const device = await this.devicesRepository.findByCode(imei);

              if (device) {
                console.log(`[TCP] Connection Accepted: IMEI ${imei}`);
                socket.write(Buffer.from([0x01]));
              } else {
                console.log(`[TCP] Unauthorized IMEI: ${imei}`);
                socket.end();
              }
            } else {
              const parsed = this.parserService.parseData(data);
              if (parsed && parsed.records.length > 0) {
                const device = await this.devicesRepository.findByCode(imei);

                if (!device) return;

                for (const record of parsed.records) {
                  // 1. Simpan ke Log (Histori)
                  // Kita tangkap hasilnya untuk mendapatkan ID BigInt yang baru saja dibuat
                  const newLog: any = await this.logsRepository.create({
                    time: record.timestamp,
                    equipment_id: device.equipment_id,
                    device_id: device.id,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    speed: record.speed,
                    fuel_level: record.fuel_raw,
                    engine_status: record.ignition,
                    vessel_status: record.speed > 0 ? 'moving' : 'idle',
                  });

                  // 2. Update Status (Posisi Terakhir / Upsert)
                  // ID log dikirim agar tabel status tahu log mana yang menjadi referensi terakhir
                  await this.equipmentStatusService.updateStatus({
                    equipment_id: device.equipment_id,
                    log_id: newLog?.id?.toString(), // Pastikan dikirim sebagai string
                    latitude: record.latitude,
                    longitude: record.longitude,
                    speed: record.speed,
                    fuel_level: record.fuel_raw,
                    engine_status: record.ignition,
                    status: record.speed > 0 ? 'moving' : 'idle',
                  });
                }

                const ack = Buffer.alloc(4);
                ack.writeInt32BE(parsed.total, 0);
                socket.write(ack);

                console.log(
                  `[TCP] Processed ${parsed.total} records & updated status for IMEI ${imei}`,
                );
              }
            }
          } catch (error: any) {
            console.error(`[TCP] Error processing data: ${error.message}`);
          }
        })();
      });

      socket.on('error', (err) =>
        console.error(`[TCP] Socket Error: ${err.message}`),
      );
      socket.on('end', () => console.log(`[TCP] Connection Closed: ${imei}`));
    });

    this.server.listen(this.PORT, '0.0.0.0', () => {
      console.log(`🚀 Teltonika TCP Server listening on port ${this.PORT}`);
    });
  }
}
