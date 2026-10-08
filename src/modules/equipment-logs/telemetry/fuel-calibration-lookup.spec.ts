import { createCalibrationLookup } from './fuel-calibration-lookup';
import { FuelCalibrationsService } from '../../fuel-calibrations/fuel-calibrations.service';

describe('createCalibrationLookup', () => {
  it('query sekali per level LLS, termasuk hasil gagal', async () => {
    const lookupVolume = jest.fn((_: string, lls: number) =>
      lls < 0
        ? Promise.reject(new Error('not found'))
        : Promise.resolve({ volume: lls * 2, percentage: 50 }),
    );
    const lookup = createCalibrationLookup(
      { lookupVolume } as unknown as FuelCalibrationsService,
      'eq-1',
    );

    await expect(lookup(100)).resolves.toMatchObject({ volume: 200 });
    await expect(lookup(100)).resolves.toMatchObject({ volume: 200 });
    await expect(lookup(-4)).rejects.toThrow('not found');
    await expect(lookup(-4)).rejects.toThrow('not found');
    await lookup(80);

    expect(lookupVolume).toHaveBeenCalledTimes(3);
    expect(lookupVolume).toHaveBeenCalledWith('eq-1', 100);
  });
});
