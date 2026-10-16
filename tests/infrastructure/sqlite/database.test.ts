import { openDatabase } from '../../../src/infrastructure/sqlite/database';

describe('openDatabase', () => {
  it('waits on locks held by other processes instead of failing at once', () => {
    const db = openDatabase(':memory:');

    expect(db.prepare('PRAGMA busy_timeout').get()).toEqual({ timeout: 5_000 });
    db.close();
  });

  it('returns a migrated database', () => {
    const db = openDatabase(':memory:');

    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'usage_logs'").get()).toEqual({
      name: 'usage_logs',
    });
    db.close();
  });
});
