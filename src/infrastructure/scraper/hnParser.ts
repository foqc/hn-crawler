import * as cheerio from 'cheerio';
import { FRONT_PAGE_SIZE, type Entry } from '../../domain/entry';

// Matches "1 comment" and "109 comments"; \s also covers the &nbsp; HN puts between them.
// Anchoring avoids false positives such as a username containing "comment".
const COMMENTS_LINK_PATTERN = /^\d+\s+comments?$/;

/** Extracts the first integer of a text such as "164 points" or "12." — 0 when there is none. */
export const parseCount = (text: string | undefined): number => {
  const match = text?.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

/**
 * Parses the Hacker News front page. Each entry spans two rows: `tr.athing` holds rank and title,
 * and the next row holds points and comments. Entries without them (job posts, "discuss") get 0.
 */
export const parseEntries = (html: string, limit = FRONT_PAGE_SIZE): Entry[] => {
  const $ = cheerio.load(html);

  return $('tr.athing')
    .slice(0, limit)
    .toArray()
    .map((row) => {
      const $row = $(row);
      const $subtext = $row.next().find('.subtext');
      const commentsText = $subtext
        .find('a')
        .toArray()
        .map((link) => $(link).text().trim())
        .find((text) => COMMENTS_LINK_PATTERN.test(text));

      return {
        rank: parseCount($row.find('.rank').text()),
        // Only the link text: the sibling ".sitebit" holds the domain, which is not part of the title.
        title: $row.find('.titleline > a').first().text().trim(),
        points: parseCount($subtext.find('.score').text()),
        comments: parseCount(commentsText),
      };
    });
};
