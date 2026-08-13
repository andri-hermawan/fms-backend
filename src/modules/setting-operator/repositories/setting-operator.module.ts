import { Module } from '@nestjs/common';
import { SettingOperatorController } from './setting-operator.controller';
import { SettingOperatorService } from './setting-operator.service';
import { SettingOperatorRepository } from './setting-operator.repository';

@Module({
  controllers: [SettingOperatorController],
  providers: [SettingOperatorService, SettingOperatorRepository],
  exports: [SettingOperatorService],
})
export class SettingOperatorModule {}