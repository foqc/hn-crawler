import type { Entry } from '../domain/entry';
import type { StoredUsageRecord, UsageRecord } from '../domain/usage';

// Ports: what the application needs from the outside world. Infrastructure implements them, so
// the application never depends on a concrete technology.

/** Returns the current time in milliseconds; injected so tests control time. */
export type Clock = () => number;

/** Where entries come from; HackerNewsScraper is the production implementation. */
export interface EntriesSource {
  fetchEntries(): Promise<Entry[]>;
}

export interface CacheResult<T> {
  readonly value: T;
  readonly hit: boolean;
}

export interface Cache<T> {
  get(load: () => Promise<T>): Promise<CacheResult<T>>;
}

/** Storage boundary for usage data. Asynchronous so it can be backed by any database. */
export interface UsageRepository {
  save(record: UsageRecord): Promise<void>;
  /** Most recent records first. */
  list(limit: number): Promise<StoredUsageRecord[]>;
}
