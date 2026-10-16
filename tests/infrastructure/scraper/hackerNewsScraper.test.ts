import { SourceUnavailableError } from '../../../src/application/errors';
import {
  HACKER_NEWS_URL,
  HackerNewsScraper,
} from '../../../src/infrastructure/scraper/hackerNewsScraper';

const HTML = `<table>
  <tr class="athing"><td><span class="rank">1.</span></td>
    <td><span class="titleline"><a href="#">Hello world</a></span></td></tr>
  <tr><td class="subtext"><span class="score">10 points</span></td></tr>
</table>`;

const fetchReturning = (body: string, status = 200) =>
  jest
    .fn<Promise<Response>, Parameters<typeof fetch>>()
    .mockResolvedValue(new Response(body, { status }));

describe('HackerNewsScraper', () => {
  it('requests the Hacker News front page', async () => {
    const fetchFn = fetchReturning(HTML);

    await new HackerNewsScraper(fetchFn).fetchEntries();

    expect(fetchFn).toHaveBeenCalledWith(HACKER_NEWS_URL, expect.anything());
  });

  it('returns the parsed entries', async () => {
    const entries = await new HackerNewsScraper(fetchReturning(HTML)).fetchEntries();

    expect(entries).toEqual([{ rank: 1, title: 'Hello world', points: 10, comments: 0 }]);
  });

  it('throws SourceUnavailableError on a non-2xx response', async () => {
    const scraper = new HackerNewsScraper(fetchReturning('Unavailable', 503));

    await expect(scraper.fetchEntries()).rejects.toThrow(
      new SourceUnavailableError(`${HACKER_NEWS_URL} responded with HTTP 503`),
    );
  });

  it('wraps network failures in SourceUnavailableError keeping the cause', async () => {
    const cause = new TypeError('fetch failed');
    const fetchFn = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockRejectedValue(cause);

    await expect(new HackerNewsScraper(fetchFn).fetchEntries()).rejects.toMatchObject({
      name: 'SourceUnavailableError',
      cause,
    });
  });
});
