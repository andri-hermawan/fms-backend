import { Prisma } from '@prisma/client';
import { AlertRuleProvider } from './alert-rule.provider';
import { ALERT_CODES, DEFAULT_ALERT_RULES } from './alert-rule.constants';
import { AlertRulesRepository } from './repositories/alert-rules.repository';

const PROJECT = 'p-1';
const dec = (v: number | null) => (v === null ? null : new Prisma.Decimal(v));

const rule = (
  code: string,
  scope: { project_id?: string; segment?: string },
  values: {
    duration_minutes?: number | null;
    speed_limit?: number | null;
    fuel_threshold?: number | null;
  },
) => ({
  project_id: scope.project_id ?? null,
  segment: scope.segment ?? null,
  duration_minutes: dec(values.duration_minutes ?? null),
  speed_limit: dec(values.speed_limit ?? null),
  fuel_threshold: dec(values.fuel_threshold ?? null),
  alert_categories: { alert_category_code: code },
});

const makeProvider = (
  rules: ReturnType<typeof rule>[],
  categories: { id: string; alert_category_code: string }[] = [],
) => {
  const repository = {
    findCategoriesByCodes: jest.fn().mockResolvedValue(categories),
    findActiveWithCategoryCode: jest.fn().mockResolvedValue(rules),
  };
  const provider = new AlertRuleProvider(
    repository as unknown as AlertRulesRepository,
  );
  return { provider, repository };
};

describe('AlertRuleProvider', () => {
  it('memakai default kode jika tabel kosong (perilaku sama seperti sebelumnya)', async () => {
    const { provider } = makeProvider([]);
    await expect(provider.resolve(PROJECT, 'Segment 3')).resolves.toEqual(
      DEFAULT_ALERT_RULES,
    );
  });

  it('memakai default kode jika query gagal (mis. tabel belum dibuat)', async () => {
    const { provider, repository } = makeProvider([]);
    repository.findActiveWithCategoryCode.mockRejectedValue(
      new Error('relation "alert_rules" does not exist'),
    );
    await expect(provider.resolve(PROJECT, 'Segment 3')).resolves.toEqual(
      DEFAULT_ALERT_RULES,
    );
    // Tidak query ulang setiap paket selama TTL.
    await provider.resolve(PROJECT, 'Segment 3');
    expect(repository.findActiveWithCategoryCode).toHaveBeenCalledTimes(1);
  });

  it('prioritas segment > project > global, per kolom', async () => {
    const { provider } = makeProvider([
      rule(ALERT_CODES.OVERSPEED, {}, { duration_minutes: 1, speed_limit: 50 }),
      rule(ALERT_CODES.OVERSPEED, { project_id: PROJECT }, { speed_limit: 45 }),
      rule(
        ALERT_CODES.OVERSPEED,
        { project_id: PROJECT, segment: 'Ramp A' },
        { speed_limit: 30 },
      ),
    ]);

    // Cocok tanpa membedakan huruf besar/kecil & spasi di ujung.
    const segment = await provider.resolve(PROJECT, ' ramp a ');
    expect(segment[ALERT_CODES.OVERSPEED]).toMatchObject({
      speedLimit: 30,
      durationMinutes: 1,
    });

    const otherSegment = await provider.resolve(PROJECT, 'Ramp B');
    expect(otherSegment[ALERT_CODES.OVERSPEED].speedLimit).toBe(45);

    const otherProject = await provider.resolve('p-2', 'Ramp A');
    expect(otherProject[ALERT_CODES.OVERSPEED].speedLimit).toBe(50);
  });

  it('category id diambil dari alert_categories berdasarkan kode', async () => {
    const { provider } = makeProvider(
      [],
      [{ id: 'cat-ovs', alert_category_code: ALERT_CODES.OVERSPEED }],
    );
    const rules = await provider.resolve(PROJECT, 'Unknown');
    expect(rules[ALERT_CODES.OVERSPEED].categoryId).toBe('cat-ovs');
    expect(rules[ALERT_CODES.OFF_TRACK].categoryId).toBe(
      DEFAULT_ALERT_RULES[ALERT_CODES.OFF_TRACK].categoryId,
    );
  });

  it('invalidate memaksa reload pada resolve berikutnya', async () => {
    const { provider, repository } = makeProvider([]);
    await provider.resolve(PROJECT, 'Unknown');
    provider.invalidate();
    await provider.resolve(PROJECT, 'Unknown');
    expect(repository.findActiveWithCategoryCode).toHaveBeenCalledTimes(2);
  });
});
