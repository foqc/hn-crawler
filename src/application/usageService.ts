import type { AppliedFilter, StoredUsageRecord, UsageRecord } from '../domain/usage';
import type { Clock, UsageRepository } from './ports';

/** How a request ended; the rest of the usage record is filled in by `record`. */
export type UsageOutcome = Pick<
  UsageRecord,
  'status' | 'resultCount' | 'cacheHit' | 'errorMessage'
>;

/** Owns the usage log: records how each request went and answers queries over it. */
export class UsageService {
  constructor(
    private readonly usage: UsageRepository,
    private readonly now: Clock,
  ) {}

  /** Records a request that started at `startedAt`; its duration is measured up to now. */
  record(filter: AppliedFilter, startedAt: number, outcome: UsageOutcome): Promise<void> {
    return this.usage.save({
      requestedAt: new Date(startedAt).toISOString(),
      filter,
      durationMs: this.now() - startedAt,
      ...outcome,
    });
  }

  getUsage(limit: number): Promise<StoredUsageRecord[]> {
    return this.usage.list(limit);
  }
}
