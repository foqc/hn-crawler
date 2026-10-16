/** The crawler only cares about the first entries of the front page. */
export const FRONT_PAGE_SIZE = 30;

/** A single Hacker News front-page entry. */
export interface Entry {
  readonly rank: number;
  readonly title: string;
  readonly points: number;
  readonly comments: number;
}
