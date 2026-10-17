/**
 * Shared BOOKS types. Single source of truth for the reading subsystem.
 */

export type BookSource = 'gutenberg' | 'local';
export type BookFormat = 'epub' | 'txt';

export interface Book {
  id: string; // 'gutenberg:1342' | 'local:<sha1>'
  title: string;
  author: string;
  source: BookSource;
  format: BookFormat;
  language?: string;
  coverUrl?: string;
  fileUri: string;
  sizeBytes: number;
  pageCount: number;
  addedAt: string;
}

export interface Chapter {
  index: number;
  title: string;
  startPage: number;
  pageCount: number;
}

export interface BookPage {
  bookId: string;
  index: number;
  chapterIndex: number;
  chapterTitle?: string;
  text: string;
  wordCount: number;
}

export interface ReadingPosition {
  bookId: string;
  pageIndex: number;
  progress: number; // 0..1
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  pageIndex: number;
  chapterTitle?: string;
  excerpt: string;
  note?: string;
  createdAt: string;
}

export interface PageWord {
  word: string;
  pageIndex: number;
  chapterIndex: number;
  count: number;
}

export interface WordHit {
  word: string;
  pageIndexes: number[];
}
