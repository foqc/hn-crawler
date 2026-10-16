import type { Entry } from '../domain/entry';
import { applyFilter, type FilterName } from '../domain/filters';
import type { AppliedFilter, UsageRecord } from '../domain/usage';
import type { Cache, Clock, EntriesSource, UsageRepository } from './ports';

export interface EntriesResult {
  readonly filter: AppliedFilter;
  readonly entries: readonly Entry[];
}

interface LoadedEntries {
  readonly entries: readonly Entry[];
  readonly cacheHit: boolean;
}

type UsageOutcome = Pick<UsageRecord, 'status' | 'resultCount' | 'cacheHit' | 'errorMessage'>;

/** Gets the front page entries, optionally filtered, and records the usage of every request. */
export class EntriesService {
  constructor(
    private readonly source: EntriesSource,
    private readonly cache: Cache<readonly Entry[]>,
    private readonly usage: UsageRepository,
    private readonly now: Clock,
  ) {}

  async getEntries(filterName?: FilterName): Promise<EntriesResult> {
    const filter = filterName ?? 'none';
    const startedAt = this.now();

    let loaded: LoadedEntries;
    try {
      loaded = await this.loadEntries();
    } catch (error) {
      await this.saveUsage(filter, startedAt, {
        status: 'error',
        resultCount: 0,
        cacheHit: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // Outside the try block: if saving the usage fails, it must not be recorded again as a failure.
    const entries = filterName ? applyFilter(loaded.entries, filterName) : loaded.entries;
    await this.saveUsage(filter, startedAt, {
      status: 'success',
      resultCount: entries.length,
      cacheHit: loaded.cacheHit,
      errorMessage: null,
    });
    return { filter, entries };
  }

  /** Cache-aside: serves the cached entries if present, otherwise scrapes and caches them. */
  private async loadEntries(): Promise<LoadedEntries> {
    const cached = await this.cache.get();
    if (cached !== undefined) {
      return { entries: cached, cacheHit: true };
    }

    const entries = await this.source.fetchEntries();
    await this.cache.set(entries);
    return { entries, cacheHit: false };
  }

  private saveUsage(
    filter: AppliedFilter,
    startedAt: number,
    outcome: UsageOutcome,
  ): Promise<void> {
    return this.usage.save({
      requestedAt: new Date(startedAt).toISOString(),
      filter,
      durationMs: this.now() - startedAt,
      ...outcome,
    });
  }
}
