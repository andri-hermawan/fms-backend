export interface OperationalStatusInput {
  gsmSignal: number;
  gsmOperator: number | undefined;
  isEngineOn: boolean;
  currentSpeed: number;
  // Menit sejak log sebelumnya.
  diffMinutes: number;
  idleThreshold: number;
}

export function resolveOperationalStatus({
  gsmSignal,
  gsmOperator,
  isEngineOn,
  currentSpeed,
  diffMinutes,
  idleThreshold,
}: OperationalStatusInput): string {
  // OFFLINE: invalid GSM signal, or missing operator.
  if (gsmSignal <= 0 || !gsmOperator) return 'OFFLINE';
  // RUNNING: engine on and vehicle moving.
  if (isEngineOn && currentSpeed > 0) return 'RUNNING';
  // IDLE: engine on, stopped, and threshold elapsed.
  if (isEngineOn && currentSpeed === 0 && diffMinutes >= idleThreshold)
    return 'IDLE';
  // STOP: engine off and speed is zero.
  if (!isEngineOn && currentSpeed === 0) return 'STOP';
  // Transition state: telemetry has not reached the configured threshold.
  if (isEngineOn) return currentSpeed > 0 ? 'RUNNING' : 'IDLE';
  return 'STOP';
}
