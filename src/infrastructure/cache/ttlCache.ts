import type { Cache, Clock } from '../../application/ports';

/** In-memory cache for a single value that expires `ttlMs` after it is set. */
export class TtlCache<T> implements Cache<T> {
  private entry?: { readonly value: T; readonly expiresAt: number };

  constructor(
    private readonly ttlMs: number,
    private readonly now: Clock,
  ) {}

  get(): Promise<T | undefined> {
    const isFresh = this.entry !== undefined && this.now() < this.entry.expiresAt;
    return Promise.resolve(isFresh ? this.entry?.value : undefined);
  }

  set(value: T): Promise<void> {
    this.entry = { value, expiresAt: this.now() + this.ttlMs };
    return Promise.resolve();
  }
}
