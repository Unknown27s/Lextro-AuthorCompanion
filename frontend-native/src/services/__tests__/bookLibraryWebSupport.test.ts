jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

jest.mock('expo-file-system', () => {
  class UnsupportedOnWeb {
    constructor() {
      throw new TypeError('this.validatePath is not a function');
    }
  }
  return {
    Directory: UnsupportedOnWeb,
    File: UnsupportedOnWeb,
    Paths: { document: '', cache: '' },
  };
});

import {
  BOOKS_UNSUPPORTED_ON_WEB,
  bookLibraryService,
  isBookLibrarySupported,
} from '../bookLibraryService';
import type { Book } from '../../types/books';

const aBook: Book = {
  id: 'local:abc',
  title: 'Test Book',
  author: 'UNKNOWN',
  source: 'local',
  format: 'txt',
  fileUri: 'file:///doc/LextroBooks/local_abc.txt',
  sizeBytes: 0,
  pageCount: 0,
  addedAt: '2026-01-01T00:00:00.000Z',
};

const UNSUPPORTED_MESSAGE = 'BOOKS_UNSUPPORTED_ON_WEB';

describe('book library without a filesystem (web)', () => {
  it('exposes the unsupported reason as a stable code', () => {
    expect(BOOKS_UNSUPPORTED_ON_WEB).toBe(UNSUPPORTED_MESSAGE);
  });

  it('reports itself as unsupported', () => {
    expect(isBookLibrarySupported()).toBe(false);
  });

  it('rejects list() with the typed error instead of a filesystem crash', async () => {
    await expect(bookLibraryService.list()).rejects.toThrow(UNSUPPORTED_MESSAGE);
  });

  it('rejects readText() with the typed error', async () => {
    await expect(bookLibraryService.readText(aBook)).rejects.toThrow(UNSUPPORTED_MESSAGE);
  });

  it('rejects readBytes() with the typed error', async () => {
    await expect(bookLibraryService.readBytes(aBook)).rejects.toThrow(UNSUPPORTED_MESSAGE);
  });

  it('rejects importFromPicker() before opening a picker', async () => {
    await expect(bookLibraryService.importFromPicker()).rejects.toThrow(UNSUPPORTED_MESSAGE);
  });
});
