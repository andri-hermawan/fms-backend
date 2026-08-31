import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import { TeltonikaParserService } from './teltonika-parser.service';
import { EquipmentLogsService } from './equipment-logs.service';
import { DevicesRepository } from '../devices/repositories/devices.repository';

@Injectable()
export class TeltonikaTcpService implements OnModuleInit, OnModuleDestroy {
  private server!: net.Server;
  private readonly PORT: number;
  private readonly isProduction: boolean;
  private readonly logger = new Logger(TeltonikaTcpService.name);

  constructor(
    private readonly parserService: TeltonikaParserService,
    private readonly equipmentLogsService: EquipmentLogsService,
    private readonly devicesRepository: DevicesRepository,
    private readonly configService: ConfigService,
  ) {
    this.PORT = this.configService.get<number>('teltonikaTcpPort') ?? 5550;
    this.isProduction = this.configService.get<string>('env') === 'production';
  }

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

      // const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      // console.log(`\n[TCP] 🚪 New Socket Connection from: ${clientAddress}`);

      socket.on('data', (data) => {
        // [X-RAY LOG]: Melihat wujud asli data yang dikirim Teltonika
        // console.log(`[TCP] 📥 Raw Data Hex: ${data.toString('hex')}`);

        buffer = Buffer.concat([buffer, data]);

        void (async () => {
          try {
            // STEP 1 — IMEI HANDSHAKE
            if (!imei) {
              if (buffer.length < 2) {
                this.logger.debug(
                  `[TCP] ⏳ Buffer kurang dari 2 bytes (${buffer.length} bytes), menunggu...`,
                );
                return;
              }

              const length = buffer.readUInt16BE(0);
              // [X-RAY LOG]: Cek kalkulasi panjang payload
              // this.logger.debug(
              //   `[TCP] 📏 Panjang Payload IMEI (dari 2 byte awal): ${length}`,
              // );

              if (buffer.length < 2 + length) {
                this.logger.debug(
                  `[TCP] ⏳ Menunggu sisa payload IMEI (Butuh ${2 + length}, baru ada ${buffer.length})...`,
                );
                return;
              }

              const imeiBuffer = buffer.slice(0, 2 + length);
              // [X-RAY LOG]: Cek buffer yang dipotong untuk IMEI
              // console.log(
              //   `[TCP] 🔍 Memproses IMEI Buffer: ${imeiBuffer.toString('hex')}`,
              // );

              imei = this.parserService.parseImei(imeiBuffer);
              buffer = buffer.slice(2 + length);

              // [X-RAY LOG]: Pastikan IMEI berhasil ter-parse jadi teks
              // console.log(`[TCP] 📌 Hasil Parse IMEI: ${imei}`);
              // console.log(`[TCP] ⏳ Mencari IMEI ${imei} di Database...`);

              const device = await this.devicesRepository.findByCode(imei);

              // [X-RAY LOG]: Pastikan pencarian DB tidak hang
              // console.log(
              //   `[TCP] ✅ Pencarian DB selesai. Ditemukan: ${!!device}`,
              // );

              if (device) {
                // console.log(`[TCP] ✅ Connection Accepted: IMEI ${imei}`);
                socket.write(Buffer.from([0x01]));
              } else {
                // console.log(`[TCP] ❌ Unauthorized IMEI: ${imei}`);
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
              // console.log(
              //   `[TCP] Raw Packet Length: ${packet.length}, Codec ID: 0x${codecId.toString(16)}`,
              // );

              // if (codecId === 0x08) {
              //   console.warn(
              //     '⚠️ PERANGKAT MASIH PAKAI CODEC 8 STANDAR. ID 51150 PASTI TIDAK ADA.',
              //   );
              // } else if (codecId === 0x8e) {
              //   console.log(
              //     '✅ PERANGKAT SUDAH PAKAI CODEC 8 EXTENDED. CEK ID 51150 SEKARANG.',
              //   );
              // }

              if (codecId !== 0x08 && codecId !== 0x8e) {
                this.logger.error(`[TCP] ❌ Unsupported codec: ${codecId}`);
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

                  // Log monitoring detail hanya di environment non-production
                  if (!this.isProduction) {
                    this.logger.log(
                      `[Monitoring Data GPS TRACKER] 
                        time: ${record.timestamp} (${new Date(record.timestamp).toISOString()}),
                        latitude: ${record.latitude},
                        longitude: ${record.longitude}, 
                        fuel_level: ${record.lls_fuel_level_1 ?? 0}, 
                        fuel_temperature: ${record.lls_temperature_1 ?? 0}, 
                        speed: ${record.speed}, 
                        mileage: ${record.odometer}, 
                        engine_status: ${record.ignition}, 
                        gsm_signal: ${record.gsm_signal}, 
                        gsm_operator: ${record.gsm_operator},
                        accelerometer_x: ${record.accelerometer_x},
                        accelerometer_y: ${record.accelerometer_y},
                        accelerometer_z: ${record.accelerometer_z},
                        raw_io_ids: ${Object.keys(record.all_params).join(', ')}`,
                    );
                  }

                  // console.log(
                  //   `[GPS] 
                  //     Latitude: ${record.latitude},
                  //     Longitude: ${record.longitude}, 
                  //     Altitude: ${record.altitude}, 
                  //     Heading: ${record.heading}, 
                  //     Satelite: ${record.satellites}, 
                  //     Speed: ${record.speed} km/h`,
                  // );
                  // console.log(
                  //   `[Accelerometer] 
                  //     X: ${record.accelerometer_x},
                  //     Y: ${record.accelerometer_y},
                  //     Z: ${record.accelerometer_z}`,
                  // );
                  // console.log(
                  //   `[Vehicle] 
                  //     Ignition: ${record.ignition},
                  //     Odometer: ${record.odometer},
                  //   `,
                  // );
                  // console.log(
                  //   `[Power] 
                  //     Speed: ${record.speed} km/h`,
                  // );
                  // console.log(
                  //   `[Vehicle] 
                  //     Ignition: ${record.ignition},
                  //     Odometer: ${record.odometer},
                  //   `,
                  // );
                  // console.log(
                  //   `[Power] 
                  //     External Voltage: ${record.external_voltage},
                  //     Internal Battery Voltage: ${record.internal_battery_voltage},
                  //     Battery Current: ${record.battery_current},
                  //   `,
                  // );
                  // console.log(
                  //   `[GSM] 
                  //     Gsm Signal: ${record.gsm_signal},
                  //     Gsm Operator: ${record.gsm_operator},
                  //   `,
                  // );
                  // console.log(
                  //   `[GPS Accuracy] 
                  //     Pdop: ${record.pdop},
                  //     Hdop: ${record.hdop},
                  //     Gnss Status: ${record.gnss_status},
                  //   `,
                  // );
                  // console.log(
                  //   `[Fuel Sensor] 
                  //     Lls Fuel Level 1: ${record.lls_fuel_level_1},
                  //     Lls Temperature 1: ${record.lls_temperature_1},
                  //     UL202: ${record.ul202},
                  //   `,
                  // );
                  // console.log(
                  //   `[Device] 
                  //     Sleep Mode: ${record.sleep_mode},
                  //     Movement Runtime: ${record.movement_runtime},
                  //   `,
                  // );
                  // console.log(
                  //   `[Analog] 
                  //     Analog Input 1: ${record.analog_input_1},
                  //   `,
                  // );

                  // console.log(
                  //   `[RAW KEYS] Available IDs: ${Object.keys(record.all_params).join(', ')}`,
                  // );
                  // console.log(
                  //   `[TIME] Timestamp: ${record.timestamp} (${new Date(record.timestamp).toISOString()})`,
                  // );

                  // console.log(`------------------------------------------`);

                  // Simpan ke Log Historis via Service (banyak logic di dalamnya)
                  await this.equipmentLogsService.create({
                    time: new Date().toISOString(),
                    equipment_id: device.equipment_id ?? undefined,
                    device_id: device.id ?? undefined,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    altitude: record.altitude,
                    heading: record.heading,
                    satellites: record.satellites,
                    speed: record.speed,
                    fuel_level: record.lls_fuel_level_1 ?? 0,
                    fuel_temperature: record.lls_temperature_1 ?? 0,
                    engine_status: record.ignition ?? false,
                    gsm_signal: record.gsm_signal,
                    gsm_operator: record.gsm_operator,
                    accelerometer_x: record.accelerometer_x,
                    accelerometer_y: record.accelerometer_y,
                    accelerometer_z: record.accelerometer_z,
                    odometer: record.odometer,
                    mileage: record.odometer,
                    external_voltage: record.external_voltage,
                    internal_battery_voltage: record.internal_battery_voltage,
                    battery_current: record.battery_current,
                    pdop: record.pdop,
                    hdop: record.hdop,
                    gnss_status: record.gnss_status,
                    sleep_mode: record.sleep_mode,
                    movement_runtime: record.movement_runtime,
                    analog_input_1: record.analog_input_1,
                  });
                }

                // ACK: Balas dengan jumlah data (4 bytes)
                const ack = Buffer.alloc(4);
                ack.writeUInt32BE(parsed.total, 0);
                socket.write(ack);

                // console.log(
                //   `[TCP] 🚀 Processed ${parsed.total} records for IMEI ${imei}`,
                // );
              }
            }
          } catch (error: any) {
            this.logger.error(
              `[TCP] ❌ Error Catch Block: ${error.stack || error.message}`,
            );
          }
        })();
      });

      socket.on('error', (err) =>
        this.logger.error(`[TCP] Socket Error: ${err.message}`),
      );
      // socket.on('end', () =>
      //   this.logger.debug(`[TCP] 🔌 Connection Closed: ${imei}`),
      // );
    });

    this.server.listen(this.PORT, '0.0.0.0', () => {
      this.logger.log(`🚀 Teltonika TCP Server listening on port ${this.PORT}`);
    });
  }
}
