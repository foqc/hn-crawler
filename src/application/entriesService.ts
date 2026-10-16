import type { Entry } from '../domain/entry';
import { applyFilter, type FilterName } from '../domain/filters';
import type { AppliedFilter, StoredUsageRecord, UsageRecord } from '../domain/usage';
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

/** Use cases of the crawler: get (optionally filtered) entries and read the usage log. */
export class EntriesService {
  constructor(
    private readonly source: EntriesSource,
    private readonly cache: Cache<readonly Entry[]>,
    private readonly usage: UsageRepository,
    private readonly now: Clock,
  ) {}

  async getEntries(filterName?: FilterName): Promise<EntriesResult> {
    const filter = filterName ?? 'none';
    const { entries } = await this.tracked(filter, () => this.loadEntries(filterName));
    return { filter, entries };
  }

  getUsage(limit: number): Promise<StoredUsageRecord[]> {
    return this.usage.list(limit);
  }

  /** Reads entries through the cache and applies the filter, if any. */
  private async loadEntries(filterName?: FilterName): Promise<LoadedEntries> {
    const { entries, cacheHit } = await this.fetchWithCache();
    return { entries: filterName ? applyFilter(entries, filterName) : entries, cacheHit };
  }

  /** Cache-aside: serves the cached entries if present, otherwise scrapes and caches them. */
  private async fetchWithCache(): Promise<LoadedEntries> {
    const cached = await this.cache.get();
    if (cached !== undefined) {
      return { entries: cached, cacheHit: true };
    }

    const entries = await this.source.fetchEntries();
    await this.cache.set(entries);
    return { entries, cacheHit: false };
  }

  /** Runs an operation and records its usage exactly once, whether it succeeds or fails. */
  private async tracked(
    filter: AppliedFilter,
    operation: () => Promise<LoadedEntries>,
  ): Promise<LoadedEntries> {
    const startedAt = this.now();

    const result = await operation().catch(async (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.saveUsage(filter, startedAt, {
        status: 'error',
        resultCount: 0,
        cacheHit: false,
        errorMessage,
      });
      throw error;
    });

    await this.saveUsage(filter, startedAt, {
      status: 'success',
      resultCount: result.entries.length,
      cacheHit: result.cacheHit,
      errorMessage: null,
    });
    return result;
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
