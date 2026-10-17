import { MIN_WORD_LENGTH, tokenize, buildWordIndex, searchWords } from '../bookWordIndex';
import type { BookPage } from '../../types/books';

const page = (index: number, text: string): BookPage => ({
  bookId: 'b1',
  index,
  chapterIndex: 0,
  chapterTitle: 'TEXT',
  text,
  wordCount: text.split(' ').length,
});

describe('tokenize', () => {
  it('lowercases, strips punctuation, keeps interior apostrophes and hyphens', () => {
    expect(tokenize("The Mother-in-law's coat, and it!")).toEqual([
      'the',
      "mother-in-law's",
      'coat',
      'and',
      'it',
    ]);
  });

  it('drops tokens shorter than MIN_WORD_LENGTH and pure numbers', () => {
    expect(tokenize('a I 42 go')).toEqual(['go']);
    expect(MIN_WORD_LENGTH).toBe(2);
  });
});

describe('buildWordIndex', () => {
  it('counts words per page and keeps every word (no stoplist)', () => {
    const index = buildWordIndex([page(0, 'the cat sat the mat'), page(1, 'cat nap')]);
    expect(index).toContainEqual({ word: 'the', pageIndex: 0, chapterIndex: 0, count: 2 });
    expect(index).toContainEqual({ word: 'cat', pageIndex: 0, chapterIndex: 0, count: 1 });
    expect(index).toContainEqual({ word: 'cat', pageIndex: 1, chapterIndex: 0, count: 1 });
  });
});

describe('searchWords', () => {
  it('orders exact, then prefix, then substring matches', () => {
    const index = buildWordIndex([page(0, 'cat catalog scatter bobcat')]);
    const hits = searchWords(index, 'cat');
    expect(hits.map((h) => h.word)).toEqual(['cat', 'catalog', 'scatter', 'bobcat']);
  });

  it('collects every page a word appears on, ascending', () => {
    const index = buildWordIndex([page(0, 'sea'), page(3, 'sea'), page(7, 'sea')]);
    const hits = searchWords(index, 'sea');
    expect(hits).toEqual([{ word: 'sea', pageIndexes: [0, 3, 7] }]);
  });

  it('returns nothing for an empty query', () => {
    expect(searchWords(buildWordIndex([page(0, 'sea')]), '   ')).toEqual([]);
  });
});
