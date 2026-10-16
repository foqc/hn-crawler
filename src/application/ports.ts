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

/** Holds a single value; asynchronous so it can be backed by an external store such as Redis. */
export interface Cache<T> {
  /** The cached value, or `undefined` when there is none or it has expired. */
  get(): Promise<T | undefined>;
  set(value: T): Promise<void>;
}

/** Storage boundary for usage data. Asynchronous so it can be backed by any database. */
export interface UsageRepository {
  save(record: UsageRecord): Promise<void>;
  /** Most recent records first. */
  list(limit: number): Promise<StoredUsageRecord[]>;
}
