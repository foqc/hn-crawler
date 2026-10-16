/** A single Hacker News front-page entry. */
export interface Entry {
  readonly rank: number;
  readonly title: string;
  readonly points: number;
  readonly comments: number;
}
