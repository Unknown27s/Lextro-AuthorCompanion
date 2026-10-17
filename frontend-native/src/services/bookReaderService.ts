/**
 * Book Reader — parses a book once and serves its pages.
 *
 * Parsing a full novel is expensive, so results are memoised in memory for the
 * session; `invalidate` drops one book (after a re-download, for example).
 */

import type { Book, BookPage, Chapter } from '../types/books';
import { bookLibraryService } from './bookLibraryService';
import { parseEpub, parseTxt } from './bookParser';

interface ParsedBook {
  pages: BookPage[];
  chapters: Chapter[];
}

async function parseBook(book: Book): Promise<ParsedBook> {
  if (book.format === 'epub') {
    const bytes = await bookLibraryService.readBytes(book);
    return parseEpub(book.id, bytes);
  }
  const text = await bookLibraryService.readText(book);
  return parseTxt(book.id, text);
}

class BookReaderService {
  private cache = new Map<string, ParsedBook>();

  async load(book: Book): Promise<ParsedBook> {
    const cached = this.cache.get(book.id);
    if (cached) return cached;
    const parsed = await parseBook(book);
    this.cache.set(book.id, parsed);
    return parsed;
  }

  async getPage(book: Book, pageIndex: number): Promise<BookPage | null> {
    const { pages } = await this.load(book);
    return pages[pageIndex] ?? null;
  }

  async chapterAt(book: Book, pageIndex: number): Promise<Chapter | null> {
    const { pages, chapters } = await this.load(book);
    const page = pages[pageIndex];
    if (!page) return null;
    return chapters.find((chapter) => chapter.index === page.chapterIndex) ?? null;
  }

  invalidate(bookId: string): void {
    this.cache.delete(bookId);
  }
}

export const bookReaderService = new BookReaderService();
export { BookReaderService };
