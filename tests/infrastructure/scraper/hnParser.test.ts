import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FRONT_PAGE_SIZE } from '../../../src/domain/entry';
import { parseCount, parseEntries } from '../../../src/infrastructure/scraper/hnParser';

const fixture = readFileSync(join(__dirname, '../../fixtures/hn-front-page.html'), 'utf8');

/** Builds the two rows HN renders per entry; omitting `subtext` simulates a job post. */
const entryRows = (rank: number, title: string, subtext = ''): string => `
  <tr class="athing submission" id="${rank}">
    <td class="title"><span class="rank">${rank}.</span></td>
    <td class="title"><span class="titleline"><a href="https://example.com">${title}</a>
      <span class="sitebit comhead"> (<a href="from?site=example.com">example.com</a>)</span></span></td>
  </tr>
  <tr><td colspan="2"></td><td class="subtext">${subtext}</td></tr>`;

const page = (...rows: string[]): string => `<table>${rows.join('')}</table>`;

describe('parseCount', () => {
  test.each([
    ['164 points', 164],
    ['1 point', 1],
    ['109 comments', 109],
    ['12.', 12],
    ['discuss', 0],
    ['', 0],
    [undefined, 0],
  ])('parses %p as %i', (text, expected) => {
    expect(parseCount(text)).toBe(expected);
  });
});

describe('parseEntries', () => {
  describe('with the real front page fixture', () => {
    const entries = parseEntries(fixture);

    it('returns the first 30 entries with consecutive ranks', () => {
      expect(entries).toHaveLength(FRONT_PAGE_SIZE);
      expect(entries.map((e) => e.rank)).toEqual(
        Array.from({ length: FRONT_PAGE_SIZE }, (_, i) => i + 1),
      );
    });

    it('extracts rank, title, points and comments', () => {
      expect(entries[0]).toEqual({
        rank: 1,
        title: 'I Love Software Rendering',
        points: 164,
        comments: 109,
      });
    });

    it('decodes HTML entities in titles', () => {
      const titles = entries.map((e) => e.title);

      expect(titles.some((t) => t.includes("iPhone Duo's hinge"))).toBe(true);
      expect(titles.some((t) => t.includes('&#x27;'))).toBe(false);
    });

    it('returns non-negative integers for every count', () => {
      for (const { points, comments } of entries) {
        expect(Number.isInteger(points) && points >= 0).toBe(true);
        expect(Number.isInteger(comments) && comments >= 0).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    const parseSingle = (subtext: string) => parseEntries(page(entryRows(1, 'Title', subtext)))[0];

    it('excludes the site domain from the title', () => {
      expect(parseSingle('')?.title).toBe('Title');
    });

    it('treats "discuss" as zero comments', () => {
      const subtext = '<span class="score">7 points</span> <a href="item?id=1">discuss</a>';

      expect(parseSingle(subtext)).toMatchObject({ points: 7, comments: 0 });
    });

    it('parses singular point and comment', () => {
      const subtext = '<span class="score">1 point</span> <a href="item?id=1">1&nbsp;comment</a>';

      expect(parseSingle(subtext)).toMatchObject({ points: 1, comments: 1 });
    });

    it('ignores other subtext links that mention comments', () => {
      const subtext =
        '<a href="user?id=commenter">commenter</a> <a href="item?id=1">3&nbsp;comments</a>';

      expect(parseSingle(subtext)?.comments).toBe(3);
    });

    it('gives job posts zero points and comments', () => {
      expect(parseSingle('<span class="age">2 hours ago</span>')).toMatchObject({
        points: 0,
        comments: 0,
      });
    });

    it('returns at most the requested number of entries', () => {
      const rows = Array.from({ length: 35 }, (_, i) => entryRows(i + 1, `Title ${i + 1}`));

      expect(parseEntries(page(...rows))).toHaveLength(FRONT_PAGE_SIZE);
      expect(parseEntries(page(...rows), 3)).toHaveLength(3);
    });

    it('returns an empty list when there are no entries', () => {
      expect(parseEntries('<html><body>Maintenance</body></html>')).toEqual([]);
    });
  });
});
