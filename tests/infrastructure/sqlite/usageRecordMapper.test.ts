import type { UsageRecord } from '../../../src/domain/usage';
import { fromRow, toParams } from '../../../src/infrastructure/sqlite/usageRecordMapper';

const RECORD: UsageRecord = {
  requestedAt: '2026-10-16T12:00:00.000Z',
  filter: 'short-titles',
  status: 'success',
  resultCount: 5,
  durationMs: 2.5,
  cacheHit: true,
  errorMessage: null,
};

const ROW = {
  id: 7,
  requested_at: '2026-10-16T12:00:00.000Z',
  filter: 'short-titles',
  status: 'success',
  result_count: 5,
  duration_ms: 2.5,
  cache_hit: 1,
  error_message: null,
};

describe('usageRecordMapper', () => {
  it('stores booleans as integers', () => {
    expect(toParams(RECORD)).toEqual({ ...RECORD, cacheHit: 1 });
  });

  it('maps a row to a domain record', () => {
    expect(fromRow(ROW)).toEqual({ id: 7, ...RECORD });
  });

  test.each([
    ['filter', 'unknown'],
    ['status', 'pending'],
    ['requested_at', null],
    ['result_count', '5'],
    ['error_message', 42],
  ])('rejects an invalid %s (%p)', (column, value) => {
    expect(() => fromRow({ ...ROW, [column]: value })).toThrow(`Invalid usage_logs.${column}`);
  });
});
