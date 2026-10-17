/**
 * Bookmark Service — reading positions and page bookmarks (local only).
 */

import { localStorage } from '../utils/storage';
import type { Bookmark, ReadingPosition } from '../types/books';

const POSITIONS_KEY = 'reading_positions';
const BOOKMARKS_KEY = 'bookmarks';

type PositionMap = Record<string, ReadingPosition>;

function readPositions(): PositionMap {
  const raw = localStorage.getItem(POSITIONS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PositionMap;
  } catch {
    return {};
  }
}

function readBookmarks(): Bookmark[] {
  const raw = localStorage.getItem(BOOKMARKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
  } catch {
    return [];
  }
}

function writeBookmarks(marks: Bookmark[]): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(marks));
}

class BookmarkService {
  getPosition(bookId: string): ReadingPosition | null {
    return readPositions()[bookId] ?? null;
  }

  setPosition(bookId: string, pageIndex: number, pageCount: number): ReadingPosition {
    const progress = pageCount > 1 ? Math.min(1, Math.max(0, pageIndex / (pageCount - 1))) : 0;
    const position: ReadingPosition = {
      bookId,
      pageIndex,
      progress,
      updatedAt: new Date().toISOString(),
    };
    const positions = readPositions();
    positions[bookId] = position;
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
    return position;
  }

  progressFor(bookId: string): number {
    return this.getPosition(bookId)?.progress ?? 0;
  }

  listBookmarks(bookId: string): Bookmark[] {
    return readBookmarks()
      .filter((mark) => mark.bookId === bookId)
      .sort((a, b) => a.pageIndex - b.pageIndex);
  }

  addBookmark(input: {
    bookId: string;
    pageIndex: number;
    chapterTitle?: string;
    excerpt: string;
  }): Bookmark {
    const bookmark: Bookmark = {
      id: `${input.bookId}-${input.pageIndex}-${Date.now()}`,
      bookId: input.bookId,
      pageIndex: input.pageIndex,
      chapterTitle: input.chapterTitle,
      excerpt: input.excerpt.slice(0, 80),
      createdAt: new Date().toISOString(),
    };
    writeBookmarks([...readBookmarks(), bookmark]);
    return bookmark;
  }

  removeBookmark(id: string): void {
    writeBookmarks(readBookmarks().filter((mark) => mark.id !== id));
  }

  isBookmarked(bookId: string, pageIndex: number): boolean {
    return readBookmarks().some((mark) => mark.bookId === bookId && mark.pageIndex === pageIndex);
  }

  /** Returns true when the bookmark was added, false when it was removed. */
  toggleBookmark(input: {
    bookId: string;
    pageIndex: number;
    chapterTitle?: string;
    excerpt: string;
  }): boolean {
    const existing = readBookmarks().find(
      (mark) => mark.bookId === input.bookId && mark.pageIndex === input.pageIndex,
    );
    if (existing) {
      this.removeBookmark(existing.id);
      return false;
    }
    this.addBookmark(input);
    return true;
  }
}

export const bookmarkService = new BookmarkService();
export { BookmarkService };
