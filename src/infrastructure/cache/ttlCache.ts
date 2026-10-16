import type { Cache, CacheResult, Clock } from '../../application/ports';

/**
 * Caches a single value for `ttlMs`. The in-flight promise is what gets cached, so concurrent
 * callers share one load instead of all hitting the source when the entry expires (cache stampede).
 * Failed loads are not cached: the next call retries.
 */
export class TtlCache<T> implements Cache<T> {
  private entry?: { readonly promise: Promise<T>; readonly expiresAt: number };

  constructor(
    private readonly ttlMs: number,
    private readonly now: Clock,
  ) {}

  async get(load: () => Promise<T>): Promise<CacheResult<T>> {
    if (this.entry && this.now() < this.entry.expiresAt) {
      return { value: await this.entry.promise, hit: true };
    }

    const promise = load();
    this.entry = { promise, expiresAt: this.now() + this.ttlMs };

    try {
      return { value: await promise, hit: false };
    } catch (error) {
      // Only evict our own entry: a newer load may have replaced it meanwhile.
      if (this.entry.promise === promise) {
        this.entry = undefined;
      }
      throw error;
    }
  }
}
