import { DatabaseSync } from 'node:sqlite';
import { EntriesService } from '../../src/application/entriesService';
import { SourceUnavailableError } from '../../src/application/errors';
import { UsageService } from '../../src/application/usageService';
import { HELP, runCli } from '../../src/cli/program';
import type { Entry } from '../../src/domain/entry';
import { TtlCache } from '../../src/infrastructure/cache/ttlCache';
import { migrate } from '../../src/infrastructure/sqlite/schema';
import { SqliteUsageRepository } from '../../src/infrastructure/sqlite/sqliteUsageRepository';
import { anEntry } from '../support/entries';

const ENTRIES: Entry[] = [
  anEntry({ rank: 1, title: 'one two three four five six', points: 5, comments: 3 }),
  anEntry({ rank: 2, title: 'Short title', points: 10, comments: 1 }),
];

// Real services, cache and SQLite (in memory); only the Hacker News source is faked.
const setup = (fetchEntries: () => Promise<Entry[]> = () => Promise.resolve(ENTRIES)) => {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  const usageService = new UsageService(new SqliteUsageRepository(db), Date.now, () => undefined);
  const entriesService = new EntriesService(
    { fetchEntries },
    new TtlCache(60_000, Date.now),
    usageService,
    Date.now,
  );
  const out: string[] = [];
  const err: string[] = [];
  const run = (...args: string[]) =>
    runCli(
      args,
      { entriesService, usageService },
      { out: (l) => out.push(l), err: (l) => err.push(l) },
    );
  return { run, out, err, usageService, db };
};

describe('runCli', () => {
  let db: DatabaseSync | undefined;
  afterEach(() => db?.close());

  describe('entries', () => {
    it('prints every entry in page order', async () => {
      const ctx = setup();
      db = ctx.db;

      await expect(ctx.run('entries')).resolves.toBe(0);
      expect(ctx.out).toEqual([
        'none: 2 entries',
        ' 1. one two three four five six (5 points, 3 comments)',
        ' 2. Short title (10 points, 1 comment)',
      ]);
    });

    it('applies the requested filter', async () => {
      const ctx = setup();
      db = ctx.db;

      await expect(ctx.run('entries', '--filter', 'short-titles')).resolves.toBe(0);
      expect(ctx.out).toEqual(['short-titles: 1 entry', ' 2. Short title (10 points, 1 comment)']);
    });

    it('records the usage of the request, like the API does', async () => {
      const ctx = setup();
      db = ctx.db;

      await ctx.run('entries', '--filter', 'long-titles');

      await expect(ctx.usageService.getUsage(10)).resolves.toEqual([
        expect.objectContaining({ filter: 'long-titles', status: 'success', resultCount: 1 }),
      ]);
    });

    it('exits with 1 and reports the error when the source is unavailable', async () => {
      const ctx = setup(() =>
        Promise.reject(new SourceUnavailableError('HN responded with HTTP 503')),
      );
      db = ctx.db;

      await expect(ctx.run('entries')).resolves.toBe(1);
      expect(ctx.err).toEqual(['Error: HN responded with HTTP 503']);
    });
  });

  describe('usage', () => {
    it('prints the usage log, most recent first, up to the limit', async () => {
      const ctx = setup();
      db = ctx.db;
      await ctx.run('entries');
      await ctx.run('entries', '--filter', 'long-titles');
      ctx.out.length = 0;

      await expect(ctx.run('usage', '--limit', '1')).resolves.toBe(0);
      expect(ctx.out).toHaveLength(2);
      expect(ctx.out[0]).toBe('1 record');
      expect(ctx.out[1]).toMatch(/long-titles\s+success\s+1 result\s+\d+ ms\s+cache hit$/);
    });
  });

  describe('invalid arguments', () => {
    it.each([
      [[], 'Missing command'],
      [['unknown'], 'Unknown command "unknown"'],
      [['entries', 'extra'], 'Unexpected argument "extra"'],
      [['entries', '--filter', 'foo'], '--filter must be one of: long-titles, short-titles'],
      [['entries', '--limit', '5'], '--limit is only for "usage"'],
      [['usage', '--filter', 'long-titles'], '--filter is only for "entries"'],
      [['usage', '--limit', '0'], '--limit must be an integer between 1 and 500'],
      [['usage', '--limit', 'abc'], '--limit must be an integer between 1 and 500'],
      [['entries', '--verbose'], "Unknown option '--verbose'"],
    ])('rejects %p with exit code 2 and the help text', async (args, message) => {
      const ctx = setup();
      db = ctx.db;

      await expect(ctx.run(...args)).resolves.toBe(2);
      expect(ctx.err).toHaveLength(1);
      expect(ctx.err[0]).toContain(message);
      expect(ctx.err[0]).toContain(HELP);
    });

    it('does not record usage for rejected input', async () => {
      const ctx = setup();
      db = ctx.db;

      await ctx.run('entries', '--filter', 'foo');

      await expect(ctx.usageService.getUsage(10)).resolves.toEqual([]);
    });
  });

  it.each([['help'], ['--help']])('prints the help text for %p', async (arg) => {
    const ctx = setup();
    db = ctx.db;

    await expect(ctx.run(arg)).resolves.toBe(0);
    expect(ctx.out).toEqual([HELP]);
  });
});
