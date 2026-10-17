interface FakeFsState {
  store: Map<string, string | Uint8Array>;
  dirs: Set<string>;
  pick: { canceled: boolean; result: { uri: string; text(): Promise<string>; bytes(): Promise<Uint8Array> } | null };
  failDownload: boolean;
}

jest.mock('expo-file-system', () => {
  const state: FakeFsState = {
    store: new Map(),
    dirs: new Set(),
    pick: { canceled: true, result: null },
    failDownload: false,
  };
  (globalThis as unknown as { __bookFsState: FakeFsState }).__bookFsState = state;

  const join = (parts: unknown[]): string =>
    parts.map((part) => (typeof part === 'string' ? part : (part as { uri: string }).uri)).join('/');

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists(): boolean {
      return state.dirs.has(this.uri);
    }
    create(): void {
      state.dirs.add(this.uri);
    }
  }

  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists(): boolean {
      return state.store.has(this.uri);
    }
    get size(): number {
      const value = state.store.get(this.uri);
      if (value === undefined) return 0;
      return typeof value === 'string' ? value.length : value.byteLength;
    }
    write(content: string | Uint8Array): void {
      state.store.set(this.uri, content);
    }
    async text(): Promise<string> {
      const value = state.store.get(this.uri);
      return typeof value === 'string' ? value : '';
    }
    async bytes(): Promise<Uint8Array> {
      const value = state.store.get(this.uri);
      return typeof value === 'string' ? new Uint8Array() : value ?? new Uint8Array();
    }
    delete(): void {
      state.store.delete(this.uri);
    }
    static async downloadFileAsync(url: string, destination: File): Promise<File> {
      if (state.failDownload) throw new Error('DOWNLOAD_FAILED');
      state.store.set(destination.uri, `downloaded:${url}`);
      return destination;
    }
    static async pickFileAsync(): Promise<unknown> {
      return state.pick;
    }
  }

  return {
    Directory,
    File,
    Paths: { document: { uri: 'file:///doc' }, cache: { uri: 'file:///cache' } },
  };
});

import {
  bookLibraryService,
  detectFormat,
  titleFromFileName,
  fileNameFor,
  byteLengthOf,
  localIdFrom,
} from '../bookLibraryService';
import type { Book } from '../../types/books';
import type { BookResult } from '../bookApi';

const state = (globalThis as unknown as { __bookFsState: FakeFsState }).__bookFsState;

beforeEach(() => {
  state.store.clear();
  state.dirs.clear();
  state.pick = { canceled: true, result: null };
  state.failDownload = false;
});

const draftBook = (overrides: Partial<Book> = {}): Book => ({
  id: 'local:abc',
  title: 'Test Book',
  author: 'UNKNOWN',
  source: 'local',
  format: 'txt',
  fileUri: '',
  sizeBytes: 0,
  pageCount: 0,
  addedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('pure helpers', () => {
  it('detects format from a file name or uri', () => {
    expect(detectFormat('file:///docs/a.txt')).toBe('txt');
    expect(detectFormat('book.epub')).toBe('epub');
    expect(detectFormat('BOOK.EPUB?token=1')).toBe('epub');
    expect(detectFormat('file:///docs/a.pdf')).toBeNull();
  });

  it('derives a title from a file name', () => {
    expect(titleFromFileName('file:///docs/My_Great-Book.txt')).toBe('My Great Book');
    expect(titleFromFileName('').length).toBeGreaterThan(0);
  });

  it('builds a filesystem-safe file name', () => {
    expect(fileNameFor({ id: 'gutenberg:1342', format: 'epub' })).toBe('gutenberg_1342.epub');
  });

  it('measures byte length for strings and byte arrays', () => {
    expect(byteLengthOf('hello')).toBe(5);
    expect(byteLengthOf(new Uint8Array([1, 2, 3]))).toBe(3);
  });

  it('produces a stable local id for the same seed', () => {
    expect(localIdFrom('x')).toBe(localIdFrom('x'));
    expect(localIdFrom('x')).not.toBe(localIdFrom('y'));
    expect(localIdFrom('x').startsWith('local:')).toBe(true);
  });
});

describe('index operations', () => {
  it('starts empty', async () => {
    expect(await bookLibraryService.list()).toEqual([]);
  });

  it('upserts and reads back a book', async () => {
    await bookLibraryService.upsert(draftBook());
    expect(await bookLibraryService.get('local:abc')).toMatchObject({ title: 'Test Book' });
  });

  it('replaces an existing book rather than duplicating it', async () => {
    await bookLibraryService.upsert(draftBook());
    await bookLibraryService.upsert(draftBook({ title: 'Renamed' }));
    const books = await bookLibraryService.list();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Renamed');
  });

  it('lists newest first', async () => {
    await bookLibraryService.upsert(draftBook({ id: 'local:old', addedAt: '2026-01-01T00:00:00.000Z' }));
    await bookLibraryService.upsert(draftBook({ id: 'local:new', addedAt: '2026-06-01T00:00:00.000Z' }));
    expect((await bookLibraryService.list()).map((b) => b.id)).toEqual(['local:new', 'local:old']);
  });

  it('records the parsed page count', async () => {
    await bookLibraryService.upsert(draftBook());
    await bookLibraryService.setPageCount('local:abc', 42);
    expect(await bookLibraryService.get('local:abc')).toMatchObject({ pageCount: 42 });
  });

  it('ignores setPageCount for an unknown book', async () => {
    await bookLibraryService.setPageCount('missing', 5);
    expect(await bookLibraryService.list()).toEqual([]);
  });
});

describe('save', () => {
  it('writes the file and stores its uri and size', async () => {
    const saved = await bookLibraryService.save(draftBook(), 'Hello world');
    expect(saved.sizeBytes).toBe(11);
    expect(saved.fileUri).toContain('local_abc.txt');
    expect(await bookLibraryService.readText(saved)).toBe('Hello world');
  });

  it('round-trips byte content', async () => {
    const saved = await bookLibraryService.save(draftBook({ format: 'epub' }), new Uint8Array([1, 2, 3, 4]));
    expect(saved.sizeBytes).toBe(4);
    expect((await bookLibraryService.readBytes(saved)).byteLength).toBe(4);
  });
});

describe('remove', () => {
  it('deletes the file and the index entry', async () => {
    const saved = await bookLibraryService.save(draftBook(), 'content');
    await bookLibraryService.remove(saved.id);
    expect(await bookLibraryService.list()).toEqual([]);
    expect(state.store.has(saved.fileUri)).toBe(false);
  });
});

describe('download', () => {
  const result: BookResult = {
    id: 'gutenberg:1342',
    title: 'Pride and Prejudice',
    author: 'Austen, Jane',
    format: 'epub',
    url: 'http://x/1342.epub',
    downloadCount: 60000,
  };

  it('downloads the file and records the book', async () => {
    const book = await bookLibraryService.download(result);
    expect(book).toMatchObject({ id: 'gutenberg:1342', source: 'gutenberg', format: 'epub' });
    expect(book.fileUri).toContain('gutenberg_1342.epub');
    expect(book.sizeBytes).toBeGreaterThan(0);
    expect(await bookLibraryService.get('gutenberg:1342')).not.toBeNull();
  });

  it('propagates a download failure', async () => {
    state.failDownload = true;
    await expect(bookLibraryService.download(result)).rejects.toThrow('DOWNLOAD_FAILED');
  });
});

describe('importFromPicker', () => {
  it('returns null when the picker is cancelled', async () => {
    expect(await bookLibraryService.importFromPicker()).toBeNull();
  });

  it('imports a selected txt file', async () => {
    state.pick = {
      canceled: false,
      result: {
        uri: 'file:///docs/My Book.txt',
        text: async () => 'Call me Ishmael.',
        bytes: async () => new Uint8Array(),
      },
    };
    const book = await bookLibraryService.importFromPicker();
    expect(book).toMatchObject({ title: 'My Book', format: 'txt', source: 'local' });
    expect(book?.sizeBytes).toBe(16);
  });

  it('rejects an unsupported extension', async () => {
    state.pick = {
      canceled: false,
      result: { uri: 'file:///docs/paper.pdf', text: async () => '', bytes: async () => new Uint8Array() },
    };
    await expect(bookLibraryService.importFromPicker()).rejects.toThrow('UNSUPPORTED_BOOK_FORMAT');
  });
});
