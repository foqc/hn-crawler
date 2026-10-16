import type { EntriesSource } from '../../application/ports';
import { SourceUnavailableError } from '../../application/errors';
import type { Entry } from '../../domain/entry';
import { parseEntries } from './hnParser';

export const HACKER_NEWS_URL = 'https://news.ycombinator.com/';
const DEFAULT_TIMEOUT_MS = 5_000;

export interface ScraperOptions {
  readonly url?: string;
  readonly timeoutMs?: number;
}

export class HackerNewsScraper implements EntriesSource {
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
      throw new SourceUnavailableError(`Could not reach ${this.url}`, { cause: error });
    }

    if (!response.ok) {
      throw new SourceUnavailableError(`${this.url} responded with HTTP ${response.status}`);
    }

    const entries = parseEntries(await response.text());
    this.assertParsed(entries);
    return entries;
  }

  /**
   * A layout change on Hacker News would otherwise parse into an empty list or blank entries and
   * be served (and cached) as a valid answer. Points and comments may legitimately be 0.
   */
  private assertParsed(entries: readonly Entry[]): void {
    if (entries.length === 0) {
      throw new SourceUnavailableError(
        `No entries found at ${this.url}; the layout may have changed`,
      );
    }
    const invalid = entries.find((entry) => entry.rank === 0 || entry.title === '');
    if (invalid) {
      throw new SourceUnavailableError(
        `Could not parse an entry at ${this.url} (rank ${invalid.rank}, title "${invalid.title}")`,
      );
    }
  }
}
