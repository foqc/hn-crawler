import { DatabaseSync } from 'node:sqlite';
import { migrate } from './schema';

/**
 * How long a write waits for another process (e.g. the CLI next to the API) to release a lock.
 * node:sqlite is synchronous, so the wait blocks the whole event loop: it is kept short because
 * usage logging is best-effort, and dropping a row beats stalling every other request.
 */
const BUSY_TIMEOUT_MS = 250;

/** Opens the database for the app and migrates it. */
export const openDatabase = (path: string): DatabaseSync => {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  // Write-ahead logging: readers (GET /usage) never wait for a writer, and writers hold the lock
  // for less time.
  db.exec('PRAGMA journal_mode = WAL');
  migrate(db);
  return db;
};
