import type { Entry } from '../../src/domain/entry';

/** Builds an Entry with sensible defaults so each test only states what matters to it. */
export const anEntry = (overrides: Partial<Entry> = {}): Entry => ({
  rank: 1,
  title: 'A title',
  points: 0,
  comments: 0,
  ...overrides,
});
