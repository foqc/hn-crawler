import type { Entry } from '../domain/entry';
import { parseEntries } from './hnParser';

export const HACKER_NEWS_URL = 'https://news.ycombinator.com/';
const DEFAULT_TIMEOUT_MS = 5_000;

/** Raised when the front page cannot be retrieved, so callers can map it to an upstream error. */
export class ScrapeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ScrapeError';
  }
}

export interface ScraperOptions {
  readonly url?: string;
  readonly timeoutMs?: number;
}

export class HackerNewsScraper {
  private readonly url: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly fetchFn: typeof fetch,
    { url = HACKER_NEWS_URL, timeoutMs = DEFAULT_TIMEOUT_MS }: ScraperOptions = {},
  ) {
    this.url = url;
    this.timeoutMs = timeoutMs;
  }

  async fetchEntries(): Promise<Entry[]> {
    let response: Response;
    try {
      response = await this.fetchFn(this.url, { signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      throw new ScrapeError(`Could not reach ${this.url}`, { cause: error });
    }

    if (!response.ok) {
      throw new ScrapeError(`${this.url} responded with HTTP ${response.status}`);
    }

    return parseEntries(await response.text());
  }
}
