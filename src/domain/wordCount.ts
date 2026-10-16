// A token is a word when it contains at least one letter or digit (any script), so standalone
// symbols such as "-" or "|" are ignored while "self-explained" or "C++" count as one word.
const WORD_PATTERN = /[\p{L}\p{N}]/u;

/** Counts the whitespace-separated words of a text, excluding tokens made only of symbols. */
export const countWords = (text: string): number =>
  text.split(/\s+/).filter((token) => WORD_PATTERN.test(token)).length;
