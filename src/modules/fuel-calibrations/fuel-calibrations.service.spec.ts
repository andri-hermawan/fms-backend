import { ConflictException } from '@nestjs/common';
import { FuelCalibrationsService } from './fuel-calibrations.service';
import { FuelCalibrationsRepository } from './repositories/fuel-calibrations.repository';

const EQUIPMENT_ID = '11111111-1111-1111-1111-111111111111';

function setup() {
  const createMany = jest.fn().mockResolvedValue([]);
  const service = new FuelCalibrationsService({
    createMany,
  } as unknown as FuelCalibrationsRepository);
  const points = () =>
    createMany.mock.calls[0][0] as Array<{
      fuel_volume: number;
      fuel_level: number;
      calibration_type: string;
    }>;
  return { service, createMany, points };
}

describe('FuelCalibrationsService.create', () => {
  it('LLS (default) tetap membulatkan level ke integer per 5 liter', async () => {
    const { service, points } = setup();
    await service.create(
      { equipment_id: EQUIPMENT_ID, fuel_volume: 200, fuel_level: 4000 },
      'u1',
    );

    const result = points();
    expect(result).toHaveLength(41);
    expect(result[0]).toMatchObject({ fuel_volume: 0, fuel_level: 0 });
    expect(result[1]).toMatchObject({ fuel_volume: 5, fuel_level: 100 });
    expect(result[40]).toMatchObject({ fuel_volume: 200, fuel_level: 4000 });
    expect(result.every((p) => p.calibration_type === 'LLS')).toBe(true);
  });

  it('LLS: level tidak dibulatkan berbeda dari perilaku lama (Math.round)', async () => {
    const { service, points } = setup();
    await service.create(
      { equipment_id: EQUIPMENT_ID, fuel_volume: 200, fuel_level: 101 },
      'u1',
    );

    // 5/200*101 = 2.525 -> 3
    expect(points()[1].fuel_level).toBe(3);
  });

  it('PERCENTAGE: level 0-100 per 5 liter tanpa pembulatan integer', async () => {
    const { service, points } = setup();
    await service.create(
      {
        equipment_id: EQUIPMENT_ID,
        fuel_volume: 200,
        calibration_type: 'PERCENTAGE',
      },
      'u1',
    );

    const result = points();
    expect(result).toHaveLength(41);
    expect(result[0]).toMatchObject({ fuel_volume: 0, fuel_level: 0 });
    expect(result[1]).toMatchObject({ fuel_volume: 5, fuel_level: 2.5 });
    expect(result[40]).toMatchObject({ fuel_volume: 200, fuel_level: 100 });
    expect(result.every((p) => p.calibration_type === 'PERCENTAGE')).toBe(true);
  });

  it('PERCENTAGE: kapasitas bukan kelipatan 5 ditutup di level 100', async () => {
    const { service, points } = setup();
    await service.create(
      {
        equipment_id: EQUIPMENT_ID,
        fuel_volume: 202,
        calibration_type: 'PERCENTAGE',
      },
      'u1',
    );

    const result = points();
    expect(result).toHaveLength(42);
    expect(result[41]).toMatchObject({ fuel_volume: 202, fuel_level: 100 });
  });

  it('PERCENTAGE mengabaikan fuel_level dari input', async () => {
    const { service, points } = setup();
    await service.create(
      {
        equipment_id: EQUIPMENT_ID,
        fuel_volume: 100,
        fuel_level: 4000,
        calibration_type: 'PERCENTAGE',
      },
      'u1',
    );

    expect(points().at(-1)).toMatchObject({
      fuel_volume: 100,
      fuel_level: 100,
    });
  });

  it('LLS tanpa fuel_level ditolak', async () => {
    const { service, createMany } = setup();
    await expect(
      service.create({ equipment_id: EQUIPMENT_ID, fuel_volume: 200 }, 'u1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(createMany).not.toHaveBeenCalled();
  });
});
