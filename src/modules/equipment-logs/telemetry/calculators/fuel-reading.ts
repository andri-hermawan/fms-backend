// Sensor LLS mengirim -4 (error) atau 0 (tidak terbaca); nilai terakhir yang dipakai.
export function isInvalidFuelReading(fuelLevel: unknown): boolean {
  return Number(fuelLevel) === -4 || Number(fuelLevel) === 0;
}
