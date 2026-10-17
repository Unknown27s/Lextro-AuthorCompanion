jest.mock('../../utils/storage', () => {
  const mem = new Map<string, string>();
  return {
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
      length: 0,
      key: () => null,
    },
  };
});

import { bookmarkService } from '../bookmarkService';
import { localStorage } from '../../utils/storage';

beforeEach(() => localStorage.clear());

describe('reading position', () => {
  it('records and reads back the last-read page', () => {
    bookmarkService.setPosition('b1', 12, 101);
    expect(bookmarkService.getPosition('b1')).toMatchObject({ bookId: 'b1', pageIndex: 12 });
  });

  it('computes progress as pageIndex / (pageCount - 1)', () => {
    bookmarkService.setPosition('b1', 50, 101);
    expect(bookmarkService.progressFor('b1')).toBeCloseTo(0.5, 5);
  });

  it('clamps progress to 0..1', () => {
    bookmarkService.setPosition('b1', 0, 1);
    expect(bookmarkService.progressFor('b1')).toBe(0);
  });
});

describe('bookmarks', () => {
  it('adds, lists, and detects a bookmark', () => {
    bookmarkService.addBookmark({ bookId: 'b1', pageIndex: 4, excerpt: 'Call me Ishmael' });
    expect(bookmarkService.listBookmarks('b1')).toHaveLength(1);
    expect(bookmarkService.isBookmarked('b1', 4)).toBe(true);
    expect(bookmarkService.isBookmarked('b1', 5)).toBe(false);
  });

  it('toggles a bookmark off when it already exists', () => {
    const added = bookmarkService.toggleBookmark({ bookId: 'b1', pageIndex: 4, excerpt: 'x' });
    expect(added).toBe(true);
    const removed = bookmarkService.toggleBookmark({ bookId: 'b1', pageIndex: 4, excerpt: 'x' });
    expect(removed).toBe(false);
    expect(bookmarkService.listBookmarks('b1')).toHaveLength(0);
  });

  it('removes a bookmark by id', () => {
    const mark = bookmarkService.addBookmark({ bookId: 'b1', pageIndex: 9, excerpt: 'y' });
    bookmarkService.removeBookmark(mark.id);
    expect(bookmarkService.listBookmarks('b1')).toHaveLength(0);
  });
});
