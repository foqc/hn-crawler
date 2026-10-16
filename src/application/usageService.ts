import type { AppliedFilter, StoredUsageRecord, UsageRecord } from '../domain/usage';
import type { Clock, UsageRepository } from './ports';

/** Bounds for usage queries, shared by every entrypoint (HTTP, CLI). */
export const USAGE_LIMIT = { min: 1, max: 500, default: 50 } as const;

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
    private readonly reportError: (error: unknown) => void,
  ) {}

  /**
   * Records a request that started at `startedAt`; its duration is measured up to now.
   * Best-effort: a failure to save is reported but never thrown, so the usage log can neither
   * fail a request that worked nor replace the error of one that failed.
   */
  async record(filter: AppliedFilter, startedAt: number, outcome: UsageOutcome): Promise<void> {
    try {
      await this.usage.save({
        requestedAt: new Date(startedAt).toISOString(),
        filter,
        durationMs: this.now() - startedAt,
        ...outcome,
      });
    } catch (error) {
      this.reportError(error);
    }
  }

  getUsage(limit: number): Promise<StoredUsageRecord[]> {
    return this.usage.list(limit);
  }
}
