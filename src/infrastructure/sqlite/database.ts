import { DatabaseSync } from 'node:sqlite';
import { migrate } from './schema';

/** How long a write waits for another process (e.g. the CLI next to the API) to release a lock. */
const BUSY_TIMEOUT_MS = 5_000;

/** Opens the database, waiting on locks instead of failing with SQLITE_BUSY, and migrates it. */
export const openDatabase = (path: string): DatabaseSync => {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  migrate(db);
  return db;
};
