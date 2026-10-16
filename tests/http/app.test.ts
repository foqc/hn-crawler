import { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { EntriesService } from '../../src/application/entriesService';
import { SourceUnavailableError } from '../../src/application/errors';
import { UsageService } from '../../src/application/usageService';
import type { Entry } from '../../src/domain/entry';
import { buildApp } from '../../src/http/app';
import { TtlCache } from '../../src/infrastructure/cache/ttlCache';
import { migrate } from '../../src/infrastructure/sqlite/schema';
import { SqliteUsageRepository } from '../../src/infrastructure/sqlite/sqliteUsageRepository';
import { anEntry } from '../support/entries';

const ENTRIES: Entry[] = [
  anEntry({ rank: 1, title: 'one two three four five six', comments: 3 }),
  anEntry({ rank: 2, title: 'Short title', points: 10 }),
];

// Real services, cache and SQLite (in memory); only the Hacker News source is faked.
const setup = (fetchEntries: () => Promise<Entry[]> = () => Promise.resolve(ENTRIES)) => {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  const usageRepository = new SqliteUsageRepository(db);
  const entriesService = new EntriesService(
    { fetchEntries },
    new TtlCache(60_000, Date.now),
    usageRepository,
    Date.now,
  );
  const usageService = new UsageService(usageRepository);
  return { app: buildApp({ entriesService, usageService }), db };
};

describe('HTTP API', () => {
  let app: FastifyInstance;
  let db: DatabaseSync;

  beforeEach(() => ({ app, db } = setup()));

  afterEach(async () => {
    await app.close();
    db.close();
  });

  describe('GET /entries', () => {
    it('returns every entry when no filter is given', async () => {
      const response = await app.inject({ url: '/entries' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ filter: 'none', count: 2, entries: ENTRIES });
    });

    it.each([
      ['long-titles', [1]],
      ['short-titles', [2]],
    ])('applies the %s filter', async (filter, expectedRanks) => {
      const response = await app.inject({ url: '/entries', query: { filter } });
      const body = response.json<{ filter: string; entries: Entry[] }>();

      expect(response.statusCode).toBe(200);
      expect(body.filter).toBe(filter);
      expect(body.entries.map((e) => e.rank)).toEqual(expectedRanks);
    });

    it('rejects an unknown filter with 400', async () => {
      const response = await app.inject({ url: '/entries', query: { filter: 'unknown' } });

      expect(response.statusCode).toBe(400);
    });

    it('answers 502 when the entries source is unavailable', async () => {
      ({ app, db } = setup(() =>
        Promise.reject(new SourceUnavailableError('HN responded with HTTP 503')),
      ));

      const response = await app.inject({ url: '/entries' });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toMatchObject({ message: 'HN responded with HTTP 503' });
    });
  });

  describe('GET /usage', () => {
    it('returns the logged requests, most recent first', async () => {
      await app.inject({ url: '/entries' });
      await app.inject({ url: '/entries', query: { filter: 'short-titles' } });

      const response = await app.inject({ url: '/usage' });
      const body = response.json<{ count: number; records: { filter: string }[] }>();

      expect(response.statusCode).toBe(200);
      expect(body.count).toBe(2);
      expect(body.records.map((r) => r.filter)).toEqual(['short-titles', 'none']);
    });

    it('rejects an invalid limit with 400', async () => {
      const response = await app.inject({ url: '/usage', query: { limit: '0' } });

      expect(response.statusCode).toBe(400);
    });
  });
});
