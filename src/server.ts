import { DatabaseSync } from 'node:sqlite';
import { TtlCache } from './cache/ttlCache';
import { loadConfig } from './config';
import { buildApp } from './http/app';
import { HackerNewsScraper } from './scraper/hackerNewsScraper';
import { EntriesService } from './service/entriesService';
import { SqliteUsageRepository } from './usage/sqliteUsageRepository';

// Composition root: the only place where concrete implementations are created and wired.
const main = async (): Promise<void> => {
  const config = loadConfig(process.env);
  const now = (): number => Date.now();
  const db = new DatabaseSync(config.databasePath);

  const service = new EntriesService(
    new HackerNewsScraper(fetch),
    new TtlCache(config.cacheTtlMs, now),
    new SqliteUsageRepository(db),
    now,
  );
  const app = buildApp(service, { logger: true });

  const shutdown = async (): Promise<void> => {
    await app.close();
    db.close();
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => void shutdown());
  }

  await app.listen({ port: config.port, host: config.host });
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
