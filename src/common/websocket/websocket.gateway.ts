import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { EquipmentStatusService } from '../../modules/equipment-status/equipment-status.service';
import { GeofencesService } from '../../modules/geofences/geofences.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust sesuai frontend domain
    credentials: true,
  },
})
export class WebSocketGatewayService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebSocketGatewayService.name);

  constructor(
    private readonly equipmentStatusService: EquipmentStatusService,
    private readonly geofencesService: GeofencesService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    try {
      const [equipmentList, geofenceList] = await Promise.all([
        this.equipmentStatusService.findAll(),
        this.geofencesService.findAll({ page: 1, limit: 1000 }),
      ]);

      this.logger.log(
        `Initial data - Equipment: ${equipmentList.length}, Geofences: ${geofenceList.data?.length ?? 0}`,
      );

      client.emit('initial-data', {
        statusCode: 200,
        message: 'Initial data loaded',
        data: {
          equipments: equipmentList,
          geofences: geofenceList.data ?? [],
        },
      });

      this.logger.log(`Initial data emitted to client ${client.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to load initial data for ${client.id}`,
        error instanceof Error ? error.stack : String(error),
      );

      client.emit('initial-data-error', {
        message: 'Failed to load initial data',
      });
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Emit equipment status update
  emitEquipmentStatusUpdate(data: any) {
    this.server.emit('equipment-status-update', data);
  }

  // Emit new alert
  emitNewAlert(data: any) {
    this.server.emit('new-alert', data);
  }

  // Emit alert summary update
  emitAlertSummaryUpdate(data: any) {
    this.server.emit('alert-summary-update', data);
  }

  // Emit new equipment log
  emitNewEquipmentLog(data: any) {
    this.server.emit('new-equipment-log', data);
  }

  // Emit fuel event
  emitFuelEvent(data: any) {
    this.server.emit('fuel-event', data);
  }

  // Emit geofence event
  emitGeofenceEvent(data: any) {
    this.server.emit('geofence-event', data);
  }

  // Emit new geofence creation
  emitNewGeofence(data: any) {
    this.server.emit('new-geofence', data);
  }
}
