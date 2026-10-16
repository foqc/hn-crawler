import type { DatabaseSync } from 'node:sqlite';

const CREATE_USAGE_LOGS = `
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

/** Creates the tables the app needs. Idempotent, so it is safe to run on every startup. */
export const migrate = (db: DatabaseSync): void => {
  db.exec(CREATE_USAGE_LOGS);
};
