import { EntriesService } from '../../src/application/entriesService';
import type { UsageRepository } from '../../src/application/ports';
import { UsageService } from '../../src/application/usageService';
import type { Entry } from '../../src/domain/entry';
import type { UsageRecord } from '../../src/domain/usage';
import { TtlCache } from '../../src/infrastructure/cache/ttlCache';
import { anEntry } from '../support/entries';

const ENTRIES: Entry[] = [
  anEntry({ rank: 1, title: 'one two three four five six', comments: 3, points: 50 }),
  anEntry({ rank: 2, title: 'Short title', comments: 9, points: 10 }),
  anEntry({ rank: 3, title: 'Another title that is quite long', comments: 7, points: 99 }),
];

const setup = (fetchEntries: () => Promise<Entry[]> = () => Promise.resolve(ENTRIES)) => {
  let time = Date.parse('2026-10-16T12:00:00.000Z');
  const now = (): number => time;
  const saved: UsageRecord[] = [];
  const usage: UsageRepository = {
    save: (record) => Promise.resolve(void saved.push(record)),
    list: () => Promise.resolve([]),
  };
  // Each fetch takes 120ms of fake time, so durations are deterministic.
  const source = {
    fetchEntries: jest.fn(() => {
      time += 120;
      return fetchEntries();
    }),
  };
  const service = new EntriesService(
    source,
    new TtlCache(60_000, now),
    new UsageService(usage, now, () => undefined),
    now,
  );
  return { service, source, saved };
};

describe('EntriesService', () => {
  it('returns all entries in page order when no filter is applied', async () => {
    const { service } = setup();

    await expect(service.getEntries()).resolves.toEqual({ filter: 'none', entries: ENTRIES });
  });

  it('applies the requested filter', async () => {
    const { service } = setup();

    const result = await service.getEntries('long-titles');

    expect(result.filter).toBe('long-titles');
    expect(result.entries.map((e) => e.rank)).toEqual([3, 1]);
  });

  it('records the usage of a successful request', async () => {
    const { service, saved } = setup();

    await service.getEntries('short-titles');

    expect(saved).toEqual([
      {
        requestedAt: '2026-10-16T12:00:00.000Z',
        filter: 'short-titles',
        status: 'success',
        resultCount: 1,
        durationMs: 120,
        cacheHit: false,
        errorMessage: null,
      },
    ]);
  });

  it('scrapes once and serves later requests from the cache', async () => {
    const { service, source, saved } = setup();

    await service.getEntries();
    await service.getEntries('long-titles');

    expect(source.fetchEntries).toHaveBeenCalledTimes(1);
    expect(saved.map((r) => r.cacheHit)).toEqual([false, true]);
  });

  it('does not cache a failed scrape', async () => {
    const fetchEntries = jest
      .fn<Promise<Entry[]>, []>()
      .mockRejectedValueOnce(new Error('Hacker News is down'))
      .mockResolvedValueOnce(ENTRIES);
    const { service } = setup(fetchEntries);

    await expect(service.getEntries()).rejects.toThrow('Hacker News is down');
    await expect(service.getEntries()).resolves.toEqual({ filter: 'none', entries: ENTRIES });
  });

  it('records failed requests and rethrows the error', async () => {
    const error = new Error('Hacker News is down');
    const { service, saved } = setup(() => Promise.reject(error));

    await expect(service.getEntries('long-titles')).rejects.toBe(error);
    expect(saved).toEqual([
      expect.objectContaining({
        filter: 'long-titles',
        status: 'error',
        errorMessage: error.message,
      }),
    ]);
  });

  describe('when the usage log cannot be written', () => {
    const setupFailingUsage = (fetchEntries: () => Promise<Entry[]>) => {
      const save = jest
        .fn<Promise<void>, [UsageRecord]>()
        .mockRejectedValue(new Error('disk full'));
      const reportError = jest.fn<void, [unknown]>();
      const service = new EntriesService(
        { fetchEntries },
        new TtlCache(60_000, Date.now),
        new UsageService({ save, list: () => Promise.resolve([]) }, Date.now, reportError),
        Date.now,
      );
      return { service, save, reportError };
    };

    it('still returns the entries and reports the logging error once', async () => {
      const { service, save, reportError } = setupFailingUsage(() => Promise.resolve(ENTRIES));

      await expect(service.getEntries()).resolves.toEqual({ filter: 'none', entries: ENTRIES });
      expect(save).toHaveBeenCalledTimes(1);
      expect(reportError).toHaveBeenCalledWith(new Error('disk full'));
    });

    it('keeps the original error of a failed request', async () => {
      const original = new Error('Hacker News is down');
      const { service } = setupFailingUsage(() => Promise.reject(original));

      await expect(service.getEntries()).rejects.toBe(original);
    });
  });
});
