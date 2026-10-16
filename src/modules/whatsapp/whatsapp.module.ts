import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Module({
  providers: [WhatsappService],
  exports: [WhatsappService], // Dipakai AlertNotifierService di EquipmentLogsModule
})
export class WhatsappModule {}
