import { Module } from '@nestjs/common';
import { AlertRulesController } from './alert-rules.controller';
import { AlertRulesService } from './alert-rules.service';
import { AlertRulesRepository } from './repositories/alert-rules.repository';
import { AlertRuleProvider } from './alert-rule.provider';

@Module({
  controllers: [AlertRulesController],
  providers: [AlertRulesService, AlertRulesRepository, AlertRuleProvider],
  exports: [AlertRuleProvider], // Dipakai detector alert di EquipmentLogsModule
})
export class AlertRulesModule {}
