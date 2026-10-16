import { DatabaseSync } from 'node:sqlite';
import { EntriesService } from './application/entriesService';
import type { Config } from './config';
import { TtlCache } from './infrastructure/cache/ttlCache';
import { HackerNewsScraper } from './infrastructure/scraper/hackerNewsScraper';
import { migrate } from './infrastructure/sqlite/schema';
import { SqliteUsageRepository } from './infrastructure/sqlite/sqliteUsageRepository';

export interface Container {
  readonly entriesService: EntriesService;
  /** Releases the resources opened by the container (database handle). */
  close(): void;
}

/**
 * Composition root: the only place where concrete implementations are created and wired.
 * Independent of HTTP, so any entrypoint (API server, CLI) can reuse it.
 */
export const createContainer = (config: Config): Container => {
  const now = (): number => Date.now();
  const db = new DatabaseSync(config.databasePath);
  migrate(db);

  const entriesService = new EntriesService(
    new HackerNewsScraper(fetch),
    new TtlCache(config.cacheTtlMs, now),
    new SqliteUsageRepository(db),
    now,
  );

  return { entriesService, close: () => db.close() };
};
