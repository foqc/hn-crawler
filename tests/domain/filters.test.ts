import { applyFilter, FILTER_NAMES } from '../../src/domain/filters';
import { anEntry } from '../support/entries';

const FIVE_WORDS = 'one two three four five';
const SIX_WORDS = 'one two three four five six';

const ranksOf = (entries: readonly { rank: number }[]): number[] => entries.map((e) => e.rank);

describe('applyFilter', () => {
  describe('long-titles', () => {
    it('keeps only titles with more than five words', () => {
      const entries = [
        anEntry({ rank: 1, title: FIVE_WORDS }),
        anEntry({ rank: 2, title: SIX_WORDS }),
      ];

      expect(ranksOf(applyFilter(entries, 'long-titles'))).toEqual([2]);
    });

    it('orders by comments descending', () => {
      const entries = [
        anEntry({ rank: 1, title: SIX_WORDS, comments: 5 }),
        anEntry({ rank: 2, title: SIX_WORDS, comments: 50 }),
        anEntry({ rank: 3, title: SIX_WORDS, comments: 20 }),
      ];

      expect(ranksOf(applyFilter(entries, 'long-titles'))).toEqual([2, 3, 1]);
    });

    it('ignores standalone symbols when counting words', () => {
      const entries = [anEntry({ title: 'This is - a self-explained example' })];

      expect(applyFilter(entries, 'long-titles')).toEqual([]);
    });
  });

  describe('short-titles', () => {
    it('keeps titles with five or fewer words', () => {
      const entries = [
        anEntry({ rank: 1, title: FIVE_WORDS }),
        anEntry({ rank: 2, title: SIX_WORDS }),
        anEntry({ rank: 3, title: 'Short' }),
      ];

      expect(ranksOf(applyFilter(entries, 'short-titles'))).toEqual([1, 3]);
    });

    it('orders by points descending, with zero-point entries last', () => {
      const entries = [
        anEntry({ rank: 1, points: 0 }),
        anEntry({ rank: 2, points: 300 }),
        anEntry({ rank: 3, points: 42 }),
      ];

      expect(ranksOf(applyFilter(entries, 'short-titles'))).toEqual([2, 3, 1]);
    });
  });

  it.each(FILTER_NAMES)('%s breaks ties by rank ascending', (name) => {
    const title = name === 'long-titles' ? SIX_WORDS : FIVE_WORDS;
    const entries = [
      anEntry({ rank: 3, title, points: 10, comments: 10 }),
      anEntry({ rank: 1, title, points: 10, comments: 10 }),
      anEntry({ rank: 2, title, points: 10, comments: 10 }),
    ];

    expect(ranksOf(applyFilter(entries, name))).toEqual([1, 2, 3]);
  });

  it.each(FILTER_NAMES)('%s returns an empty list for no entries', (name) => {
    expect(applyFilter([], name)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const entries = [anEntry({ rank: 1, points: 1 }), anEntry({ rank: 2, points: 2 })];
    const snapshot = [...entries];

    applyFilter(entries, 'short-titles');

    expect(entries).toEqual(snapshot);
  });
});
