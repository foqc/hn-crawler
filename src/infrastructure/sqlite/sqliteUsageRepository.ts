import type { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import type { UsageRepository } from '../../application/ports';
import { FILTER_NAMES } from '../../domain/filters';
import type { AppliedFilter, StoredUsageRecord, UsageRecord } from '../../domain/usage';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS usage_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_at  TEXT    NOT NULL,
    filter        TEXT    NOT NULL,
    status        TEXT    NOT NULL,
    result_count  INTEGER NOT NULL,
    duration_ms   REAL    NOT NULL,
    cache_hit     INTEGER NOT NULL,
    error_message TEXT
  )`;

const INSERT = `
  INSERT INTO usage_logs
    (requested_at, filter, status, result_count, duration_ms, cache_hit, error_message)
  VALUES
    (:requestedAt, :filter, :status, :resultCount, :durationMs, :cacheHit, :errorMessage)`;

const SELECT_LATEST = 'SELECT * FROM usage_logs ORDER BY id DESC LIMIT ?';

const toFilter = (value: SQLOutputValue): AppliedFilter =>
  FILTER_NAMES.find((name) => name === value) ?? 'none';

const toRecord = (row: Record<string, SQLOutputValue>): StoredUsageRecord => ({
  id: Number(row.id),
  requestedAt: typeof row.requested_at === 'string' ? row.requested_at : '',
  filter: toFilter(row.filter),
  status: row.status === 'error' ? 'error' : 'success',
  resultCount: Number(row.result_count),
  durationMs: Number(row.duration_ms),
  cacheHit: row.cache_hit === 1,
  errorMessage: typeof row.error_message === 'string' ? row.error_message : null,
});

/**
 * Usage storage on the built-in node:sqlite module (no external dependency). The database handle is
 * injected, so tests use an in-memory database and the server a file.
 */
export class SqliteUsageRepository implements UsageRepository {
  constructor(private readonly db: DatabaseSync) {
    db.exec(CREATE_TABLE);
  }

  save(record: UsageRecord): Promise<void> {
    this.db.prepare(INSERT).run({ ...record, cacheHit: record.cacheHit ? 1 : 0 });
    return Promise.resolve();
  }

  list(limit: number): Promise<StoredUsageRecord[]> {
    return Promise.resolve(this.db.prepare(SELECT_LATEST).all(limit).map(toRecord));
  }
}
