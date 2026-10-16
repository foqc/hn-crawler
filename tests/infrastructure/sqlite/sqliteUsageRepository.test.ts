import { DatabaseSync } from 'node:sqlite';
import type { UsageRecord } from '../../../src/domain/usage';
import { SqliteUsageRepository } from '../../../src/infrastructure/sqlite/sqliteUsageRepository';

const aRecord = (overrides: Partial<UsageRecord> = {}): UsageRecord => ({
  requestedAt: '2026-10-16T12:00:00.000Z',
  filter: 'long-titles',
  status: 'success',
  resultCount: 12,
  durationMs: 3.5,
  cacheHit: true,
  errorMessage: null,
  ...overrides,
});

describe('SqliteUsageRepository', () => {
  let db: DatabaseSync;
  let repository: SqliteUsageRepository;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    repository = new SqliteUsageRepository(db);
  });

  afterEach(() => db.close());

  it('stores and returns every field of a record', async () => {
    await repository.save(aRecord());

    await expect(repository.list(10)).resolves.toEqual([{ id: 1, ...aRecord() }]);
  });

  it('keeps requests without filter and failed requests', async () => {
    const failed = aRecord({ filter: 'none', status: 'error', cacheHit: false, errorMessage: 'x' });

    await repository.save(failed);

    await expect(repository.list(10)).resolves.toEqual([{ id: 1, ...failed }]);
  });

  it('lists the most recent records first, up to the limit', async () => {
    for (const filter of ['none', 'long-titles', 'short-titles'] as const) {
      await repository.save(aRecord({ filter }));
    }

    const records = await repository.list(2);

    expect(records.map((r) => r.filter)).toEqual(['short-titles', 'long-titles']);
  });

  it('reuses an existing table instead of recreating it', async () => {
    await repository.save(aRecord());

    await expect(new SqliteUsageRepository(db).list(10)).resolves.toHaveLength(1);
  });
});
