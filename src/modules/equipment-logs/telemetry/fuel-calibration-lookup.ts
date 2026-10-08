import { FuelCalibrationsService } from '../../fuel-calibrations/fuel-calibrations.service';

export type FuelCalibration = Awaited<
  ReturnType<FuelCalibrationsService['lookupVolume']>
>;

export type CalibrationLookup = (fuelLevel: number) => Promise<FuelCalibration>;

/**
 * Lookup kalibrasi yang di-memo per paket telemetry.
 * Level LLS yang sama (current / previous / awal streak) cukup di-query sekali,
 * termasuk hasil gagal (NotFound) agar perilakunya tetap sama.
 */
export function createCalibrationLookup(
  service: FuelCalibrationsService,
  equipmentId: string,
): CalibrationLookup {
  const cache = new Map<number, Promise<FuelCalibration>>();

  return (fuelLevel: number) => {
    let result = cache.get(fuelLevel);
    if (!result) {
      result = service.lookupVolume(equipmentId, fuelLevel);
      cache.set(fuelLevel, result);
    }
    return result;
  };
}
