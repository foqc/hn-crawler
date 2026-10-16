import type { Entry } from '../domain/entry';
import { applyFilter, type FilterName } from '../domain/filters';
import type { AppliedFilter, StoredUsageRecord, UsageRecord } from '../domain/usage';
import type { Cache, Clock, EntriesSource, UsageRepository } from './ports';

export interface EntriesResult {
  readonly filter: AppliedFilter;
  readonly entries: readonly Entry[];
}

/** Use cases of the crawler: get (optionally filtered) entries and read the usage log. */
export class EntriesService {
  constructor(
    private readonly source: EntriesSource,
    private readonly cache: Cache<readonly Entry[]>,
    private readonly usage: UsageRepository,
    private readonly now: Clock,
  ) {}

  async getEntries(filterName?: FilterName): Promise<EntriesResult> {
    const startedAt = this.now();
    const filter = filterName ?? 'none';
    const record = (outcome: Omit<UsageRecord, 'requestedAt' | 'filter' | 'durationMs'>) =>
      this.usage.save({
        requestedAt: new Date(startedAt).toISOString(),
        filter,
        durationMs: this.now() - startedAt,
        ...outcome,
      });

    let entries: readonly Entry[];
    let cacheHit: boolean;
    try {
      const cached = await this.cache.get(() => this.source.fetchEntries());
      entries = filterName ? applyFilter(cached.value, filterName) : cached.value;
      cacheHit = cached.hit;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await record({ status: 'error', resultCount: 0, cacheHit: false, errorMessage });
      throw error;
    }

    await record({ status: 'success', resultCount: entries.length, cacheHit, errorMessage: null });
    return { filter, entries };
  }

  getUsage(limit: number): Promise<StoredUsageRecord[]> {
    return this.usage.list(limit);
  }
}
