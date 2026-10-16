import type { FilterName } from '../domain/filters';

export type AppliedFilter = FilterName | 'none';
export type RequestStatus = 'success' | 'error';

/** One request to the crawler: what was asked and how the crawler behaved. */
export interface UsageRecord {
  readonly requestedAt: string;
  readonly filter: AppliedFilter;
  readonly status: RequestStatus;
  readonly resultCount: number;
  readonly durationMs: number;
  readonly cacheHit: boolean;
  readonly errorMessage: string | null;
}

export interface StoredUsageRecord extends UsageRecord {
  readonly id: number;
}

/** Storage boundary for usage data. Asynchronous so it can be backed by any database. */
export interface UsageRepository {
  save(record: UsageRecord): Promise<void>;
  /** Most recent records first. */
  list(limit: number): Promise<StoredUsageRecord[]>;
}
