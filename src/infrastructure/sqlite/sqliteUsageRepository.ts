import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { UsageRepository } from '../../application/ports';
import type { StoredUsageRecord, UsageRecord } from '../../domain/usage';
import { fromRow, toParams } from './usageRecordMapper';

const INSERT = `
  INSERT INTO usage_logs
    (requested_at, filter, status, result_count, duration_ms, cache_hit, error_message)
  VALUES
    (:requestedAt, :filter, :status, :resultCount, :durationMs, :cacheHit, :errorMessage)`;

const SELECT_LATEST = 'SELECT * FROM usage_logs ORDER BY id DESC LIMIT ?';

/**
 * Usage storage on the built-in node:sqlite module (no external dependency). Expects a migrated
 * database (see schema.ts); statements are prepared once and reused on every request.
 */
export class SqliteUsageRepository implements UsageRepository {
  private readonly insert: StatementSync;
  private readonly selectLatest: StatementSync;

  constructor(db: DatabaseSync) {
    this.insert = db.prepare(INSERT);
    this.selectLatest = db.prepare(SELECT_LATEST);
  }

  // node:sqlite is synchronous; `async` keeps the Promise contract of UsageRepository, so a failing
  // statement becomes a rejected promise instead of a synchronous throw.
  /* eslint-disable @typescript-eslint/require-await */
  async save(record: UsageRecord): Promise<void> {
    this.insert.run(toParams(record));
  }

  async list(limit: number): Promise<StoredUsageRecord[]> {
    return this.selectLatest.all(limit).map(fromRow);
  }
  /* eslint-enable @typescript-eslint/require-await */
}
