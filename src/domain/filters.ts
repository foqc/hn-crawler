import type { Entry } from './entry';
import { countWords } from './wordCount';

const SHORT_TITLE_MAX_WORDS = 5;

type SortableField = 'points' | 'comments';

interface EntryFilter {
  readonly matches: (entry: Entry) => boolean;
  readonly sortBy: SortableField;
}

// Filters are data: adding a new one only requires a new entry in this map.
export const FILTERS = {
  'long-titles': {
    matches: (entry) => countWords(entry.title) > SHORT_TITLE_MAX_WORDS,
    sortBy: 'comments',
  },
  'short-titles': {
    matches: (entry) => countWords(entry.title) <= SHORT_TITLE_MAX_WORDS,
    sortBy: 'points',
  },
} as const satisfies Record<string, EntryFilter>;

export type FilterName = keyof typeof FILTERS;

// Object.keys is typed as string[]; the cast is safe because FILTERS is a closed literal.
export const FILTER_NAMES = Object.keys(FILTERS) as readonly FilterName[];

/**
 * Keeps the entries matching the filter, ordered by its field in descending order.
 * Ties keep the original page order (rank ascending). The input array is never mutated.
 */
export const applyFilter = (entries: readonly Entry[], name: FilterName): Entry[] => {
  const { matches, sortBy } = FILTERS[name];
  return entries.filter(matches).sort((a, b) => b[sortBy] - a[sortBy] || a.rank - b.rank);
};
