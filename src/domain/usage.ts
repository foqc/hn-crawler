import type { FilterName } from './filters';

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
