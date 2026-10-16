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

  it.each([
    ['the page has no entries', '<html><body>Maintenance</body></html>', /No entries found/],
    [
      'an entry has no rank',
      HTML.replace('<span class="rank">1.</span>', ''),
      /Could not parse an entry/,
    ],
    [
      'an entry has no title',
      HTML.replace('<a href="#">Hello world</a>', ''),
      /Could not parse an entry/,
    ],
  ])('throws SourceUnavailableError when %s', async (_case, html, message) => {
    const scraper = new HackerNewsScraper(fetchReturning(html));

    const error = await scraper.fetchEntries().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SourceUnavailableError);
    expect(error).toHaveProperty('message', expect.stringMatching(message));
  });

  it('wraps failures while reading the body in SourceUnavailableError keeping the cause', async () => {
    const cause = new TypeError('terminated');
    const response = new Response(HTML);
    jest.spyOn(response, 'text').mockRejectedValue(cause);
    const fetchFn = jest
      .fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(response);

    await expect(new HackerNewsScraper(fetchFn).fetchEntries()).rejects.toMatchObject({
      name: 'SourceUnavailableError',
      message: `Could not read the response from ${HACKER_NEWS_URL}`,
      cause,
    });
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
