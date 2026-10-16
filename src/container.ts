import { EntriesService } from './application/entriesService';
import { UsageService } from './application/usageService';
import type { Config } from './config';
import { TtlCache } from './infrastructure/cache/ttlCache';
import { HackerNewsScraper } from './infrastructure/scraper/hackerNewsScraper';
import { openDatabase } from './infrastructure/sqlite/database';
import { SqliteUsageRepository } from './infrastructure/sqlite/sqliteUsageRepository';

export interface Container {
  readonly entriesService: EntriesService;
  readonly usageService: UsageService;
  /** Releases the resources opened by the container (database handle). */
  close(): void;
}

/**
 * Composition root: the only place where concrete implementations are created and wired.
 * Independent of HTTP, so any entrypoint (API server, CLI) can reuse it.
 */
export const createContainer = (config: Config): Container => {
  const now = (): number => Date.now();
  const db = openDatabase(config.databasePath);

  const usageService = new UsageService(new SqliteUsageRepository(db), now, (error) =>
    console.error('Could not record usage:', error),
  );
  const entriesService = new EntriesService(
    new HackerNewsScraper(fetch),
    new TtlCache(config.cacheTtlMs, now),
    usageService,
    now,
  );

  return { entriesService, usageService, close: () => db.close() };
};
