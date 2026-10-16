import { countWords } from '../../src/domain/wordCount';

describe('countWords', () => {
  test.each([
    ['This is - a self-explained example', 5, 'the example from the statement'],
    ['', 0, 'an empty string'],
    ['   ', 0, 'only whitespace'],
    ['Hello', 1, 'a single word'],
    ['Hello    world', 2, 'repeated spaces'],
    ['  leading and trailing  ', 3, 'leading and trailing spaces'],
    ['Hello\tworld\nagain', 3, 'tabs and line breaks'],
    ['Show HN: My new project', 5, 'a word with a trailing colon'],
    ['C++ vs Rust', 3, 'a word containing symbols'],
    ['GPT-5 is here', 3, 'a hyphenated word'],
    ['Rust | Go – Zig', 3, 'standalone pipe and en dash'],
    ['El año en España', 4, 'non-ASCII letters'],
    ['Released in 2026 (beta)', 4, 'numbers and parentheses'],
    ['... ! ?', 0, 'only symbols'],
  ])('counts %p as %i words (%s)', (text, expected) => {
    expect(countWords(text)).toBe(expected);
  });
});
