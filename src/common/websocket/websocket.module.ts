import { Module, Global } from '@nestjs/common';
import { WebSocketGatewayService } from './websocket.gateway';
import { EquipmentStatusModule } from '../../modules/equipment-status/equipment-status.module';
import { GeofencesModule } from '../../modules/geofences/geofences.module';

@Global()
@Module({
  imports: [EquipmentStatusModule, GeofencesModule],
  providers: [WebSocketGatewayService],
  exports: [WebSocketGatewayService],
})
export class WebSocketModule {}
