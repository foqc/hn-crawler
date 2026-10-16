import { FILTER_NAMES } from './filters';

export const APPLIED_FILTERS = [...FILTER_NAMES, 'none'] as const;
export type AppliedFilter = (typeof APPLIED_FILTERS)[number];

export const REQUEST_STATUSES = ['success', 'error'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

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
