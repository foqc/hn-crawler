import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../../../src/infrastructure/sqlite/database';

describe('openDatabase', () => {
  let dir: string;
  let db: DatabaseSync;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hn-crawler-'));
    db = openDatabase(join(dir, 'usage.db'));
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('waits only briefly on locks held by other processes', () => {
    expect(db.prepare('PRAGMA busy_timeout').get()).toEqual({ timeout: 250 });
  });

  it('uses write-ahead logging', () => {
    expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
  });

  it('returns a migrated database', () => {
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'usage_logs'").get()).toEqual({
      name: 'usage_logs',
    });
  });
});
