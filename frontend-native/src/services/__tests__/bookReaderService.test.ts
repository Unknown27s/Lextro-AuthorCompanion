jest.mock('../bookLibraryService', () => ({
  bookLibraryService: {
    readText: jest.fn(),
    readBytes: jest.fn(),
  },
}));

import { BookReaderService } from '../bookReaderService';
import { bookLibraryService } from '../bookLibraryService';
import type { Book } from '../../types/books';

const readText = bookLibraryService.readText as jest.Mock;
const readBytes = bookLibraryService.readBytes as jest.Mock;

const txtBook = (): Book => ({
  id: 'local:1',
  title: 'Plain',
  author: 'UNKNOWN',
  source: 'local',
  format: 'txt',
  fileUri: 'file:///b.txt',
  sizeBytes: 10,
  pageCount: 0,
  addedAt: '2026-01-01T00:00:00.000Z',
});

beforeEach(() => {
  readText.mockReset();
  readBytes.mockReset();
});

describe('load', () => {
  it('parses a txt book through the library', async () => {
    readText.mockResolvedValue('CHAPTER I\n' + 'alpha beta '.repeat(300));
    const service = new BookReaderService();
    const parsed = await service.load(txtBook());
    expect(parsed.pages.length).toBeGreaterThan(1);
    expect(parsed.chapters).toHaveLength(1);
    expect(readText).toHaveBeenCalledTimes(1);
  });

  it('memoises so a second load does not re-read the file', async () => {
    readText.mockResolvedValue('alpha beta gamma');
    const service = new BookReaderService();
    await service.load(txtBook());
    await service.load(txtBook());
    expect(readText).toHaveBeenCalledTimes(1);
  });

  it('re-parses after invalidation', async () => {
    readText.mockResolvedValue('alpha beta gamma');
    const service = new BookReaderService();
    await service.load(txtBook());
    service.invalidate('local:1');
    await service.load(txtBook());
    expect(readText).toHaveBeenCalledTimes(2);
  });

  it('routes epub books through readBytes', async () => {
    readBytes.mockRejectedValue(new Error('EPUB_INVALID: missing container'));
    const service = new BookReaderService();
    const book = { ...txtBook(), format: 'epub' as const };
    await expect(service.load(book)).rejects.toThrow('EPUB_INVALID');
    expect(readBytes).toHaveBeenCalledTimes(1);
    expect(readText).not.toHaveBeenCalled();
  });
});

describe('page access', () => {
  it('returns a page by index and null past the end', async () => {
    readText.mockResolvedValue('alpha beta gamma delta');
    const service = new BookReaderService();
    const book = txtBook();
    expect((await service.getPage(book, 0))?.text).toBe('alpha beta gamma delta');
    expect(await service.getPage(book, 99)).toBeNull();
  });

  it('reports the chapter covering a page', async () => {
    readText.mockResolvedValue('CHAPTER I\nalpha beta\nCHAPTER II\ngamma delta');
    const service = new BookReaderService();
    const book = txtBook();
    expect((await service.chapterAt(book, 0))?.title).toBe('CHAPTER I');
    expect(await service.chapterAt(book, 99)).toBeNull();
  });
});
