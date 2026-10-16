import type { StoredUsageRecord } from '../domain/usage';
import type { UsageRepository } from './ports';

/** Use cases over the usage log; recording usage is done by the services that are used. */
export class UsageService {
  constructor(private readonly usage: UsageRepository) {}

  getUsage(limit: number): Promise<StoredUsageRecord[]> {
    return this.usage.list(limit);
  }
}
