import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as net from 'net';
import { TeltonikaParserService } from './teltonika-parser.service';
import { EquipmentLogsRepository } from './repositories/equipment-logs.repository';
import { DevicesRepository } from '../devices/repositories/devices.repository';
import { EquipmentStatusService } from '../equipment-status/equipment-status.service';

@Injectable()
export class TeltonikaTcpService implements OnModuleInit, OnModuleDestroy {
  private server!: net.Server;
  private readonly PORT = 5000;

  constructor(
    private readonly parserService: TeltonikaParserService,
    private readonly logsRepository: EquipmentLogsRepository,
    private readonly devicesRepository: DevicesRepository,
    private readonly equipmentStatusService: EquipmentStatusService,
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
      let buffer = Buffer.alloc(0);

      const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`[TCP] 🚪 New Socket Connection from: ${clientAddress}`);

      socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);

        void (async () => {
          try {
            // STEP 1 — IMEI HANDSHAKE
            if (!imei) {
              if (buffer.length < 2) return;
              const length = buffer.readUInt16BE(0);
              if (buffer.length < 2 + length) return;

              const imeiBuffer = buffer.slice(0, 2 + length);
              imei = this.parserService.parseImei(imeiBuffer);
              buffer = buffer.slice(2 + length);

              const device = await this.devicesRepository.findByCode(imei);

              if (device) {
                console.log(`[TCP] ✅ Connection Accepted: IMEI ${imei}`);
                socket.write(Buffer.from([0x01]));
              } else {
                console.log(`[TCP] ❌ Unauthorized IMEI: ${imei}`);
                socket.end();
                return;
              }
            }

            // STEP 2 — AVL DATA PACKETS
            while (buffer.length >= 12) {
              // Preamble (4 bytes) + Data Length (4 bytes)
              const dataLength = buffer.readUInt32BE(4);
              const totalLength = 8 + dataLength + 4; // Header + Data + CRC

              if (buffer.length < totalLength) break;

              const packet = buffer.slice(0, totalLength);
              buffer = buffer.slice(totalLength);

              // Ambil Codec ID dari paket yang sudah dipotong
              const codecId = packet.readUInt8(8);
              console.log(
                `[TCP] Raw Packet Length: ${packet.length}, Codec ID: 0x${codecId.toString(16)}`,
              );

              if (codecId === 0x08) {
                console.warn(
                  '⚠️ PERANGKAT MASIH PAKAI CODEC 8 STANDAR. ID 51150 PASTI TIDAK ADA.',
                );
              } else if (codecId === 0x8e) {
                console.log(
                  '✅ PERANGKAT SUDAH PAKAI CODEC 8 EXTENDED. CEK ID 51150 SEKARANG.',
                );
              }

              if (codecId !== 0x08 && codecId !== 0x8e) {
                console.error(`[TCP] ❌ Unsupported codec: ${codecId}`);
                continue;
              }

              const parsed = this.parserService.parseData(packet);

              if (parsed && parsed.records.length > 0) {
                const device = await this.devicesRepository.findByCode(imei);
                if (!device) continue;

                for (const record of parsed.records) {
                  const recordYear = new Date(record.timestamp).getFullYear();
                  if (recordYear < 2025) {
                    continue;
                  }
                  console.log(`------------------------------------------`);
                  console.log(
                    `[GPS] 
                      Latitude: ${record.latitude},
                      Longitude: ${record.longitude}, 
                      Altitude: ${record.altitude}, 
                      Heading: ${record.heading}, 
                      Satelite: ${record.satellites}, 
                      Speed: ${record.speed} km/h`,
                  );
                  console.log(
                    `[Vehicle] 
                      Ignition: ${record.ignition},
                      Odometer: ${record.odometer},
                    `,
                  );
                  console.log(
                    `[Power] 
                      External Voltage: ${record.external_voltage},
                      Internal Battery Voltage: ${record.internal_battery_voltage},
                      Battery Current: ${record.battery_current},
                    `,
                  );
                  console.log(
                    `[GSM] 
                      Gsm Signal: ${record.gsm_signal},
                      Gsm Operator: ${record.gsm_operator},
                    `,
                  );
                  console.log(
                    `[GPS Accuracy] 
                      Pdop: ${record.pdop},
                      Hdop: ${record.hdop},
                      Gnss Status: ${record.gnss_status},
                    `,
                  );
                  console.log(
                    `[Fuel Sensor] 
                      Lls Fuel Level 1: ${record.lls_fuel_level_1},
                      Lls Temperature 1: ${record.lls_temperature_1},
                      UL202: ${record.ul202},
                    `,
                  );
                  console.log(
                    `[Device] 
                      Sleep Mode: ${record.sleep_mode},
                      Movement Runtime: ${record.movement_runtime},
                    `,
                  );
                  console.log(
                    `[Analog] 
                      Analog Input 1: ${record.analog_input_1},
                    `,
                  );

                  console.log(
                    `[RAW KEYS] Available IDs: ${Object.keys(record.all_params).join(', ')}`,
                  );
                  console.log(`------------------------------------------`);

                  // Simpan ke Log Historis
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

                  // Update Status Terakhir (Real-time)
                  await this.equipmentStatusService.updateStatus({
                    equipment_id: device.equipment_id,
                    log_id: newLog?.id?.toString(),
                    latitude: record.latitude,
                    longitude: record.longitude,
                    speed: record.speed,
                    fuel_level: record.fuel_raw,
                    engine_status: record.ignition,
                    status: record.speed > 0 ? 'moving' : 'idle',
                  });
                }

                // ACK: Balas dengan jumlah data (4 bytes)
                const ack = Buffer.alloc(4);
                ack.writeUInt32BE(parsed.total, 0);
                socket.write(ack);

                console.log(
                  `[TCP] 🚀 Processed ${parsed.total} records for IMEI ${imei}`,
                );
              }
            }
          } catch (error: any) {
            console.error(`[TCP] ❌ Error: ${error.message}`);
          }
        })();
      });

      socket.on('error', (err) =>
        console.error(`[TCP] Socket Error: ${err.message}`),
      );
      socket.on('end', () =>
        console.log(`[TCP] 🔌 Connection Closed: ${imei}`),
      );
    });

    this.server.listen(this.PORT, '0.0.0.0', () => {
      console.log(`🚀 Teltonika TCP Server listening on port ${this.PORT}`);
    });
  }
}
