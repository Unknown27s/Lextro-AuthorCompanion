jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

jest.mock('expo-file-system', () => ({
  Directory: class {},
  File: class {},
  Paths: { document: '' },
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: () => ({
      downloadAsync: async () => undefined,
      uri: 'asset://starter',
      localUri: null,
    }),
  },
}));

import {
  BOOK_NOT_FOUND,
  DOWNLOAD_UNSUPPORTED,
  UNSUPPORTED_BOOK_FORMAT,
  bookLibraryService,
  isRemoteCatalogueSupported,
} from '../bookLibraryService';
import type { BookResult } from '../bookApi';

interface FakeBrowserFile {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

interface FakeInput {
  type: string;
  accept: string;
  files: FakeBrowserFile[] | null;
  onchange: (() => void) | null;
  oncancel: (() => void) | null;
  click(): void;
}

let input: FakeInput;

function stubFileInput(): void {
  input = {
    type: '',
    accept: '',
    files: null,
    onchange: null,
    oncancel: null,
    click: () => undefined,
  };
  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => input,
  };
}

function choose(file: FakeBrowserFile): void {
  input.files = [file];
  input.onchange?.();
}

function stubFetch(text: string): void {
  (globalThis as unknown as { fetch: unknown }).fetch = async () => ({
    ok: true,
    text: async () => text,
  });
}

const epubBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

const prideAndPrejudice: BookResult = {
  id: 'gutenberg:1342',
  title: 'Pride and Prejudice',
  author: 'Jane Austen',
  format: 'txt',
  url: 'https://www.gutenberg.org/ebooks/1342.txt.utf-8',
  downloadCount: 190246,
};

describe('book library in the browser', () => {
  afterEach(() => {
    delete (globalThis as unknown as { document?: unknown }).document;
    delete (globalThis as unknown as { fetch?: unknown }).fetch;
  });

  it('marks the remote catalogue as unavailable', () => {
    expect(isRemoteCatalogueSupported()).toBe(false);
  });

  it('puts the bundled starter book on the shelf', async () => {
    stubFetch('CHAPTER I\n\nMr. Utterson the lawyer was a man of a rugged countenance.');

    const book = await bookLibraryService.ensureStarterBook();

    expect(book).toMatchObject({
      id: 'gutenberg:43',
      title: 'The Strange Case of Dr. Jekyll and Mr. Hyde',
      format: 'txt',
      coverUrl: 'asset://starter',
    });
    expect(await bookLibraryService.readText(book!)).toContain('Mr. Utterson');
    expect((await bookLibraryService.list()).some((entry) => entry.id === 'gutenberg:43')).toBe(
      true,
    );
  });

  it('seeds the starter book only once', async () => {
    stubFetch('body');

    await bookLibraryService.ensureStarterBook();
    await bookLibraryService.ensureStarterBook();

    const seeded = (await bookLibraryService.list()).filter((book) => book.id === 'gutenberg:43');
    expect(seeded).toHaveLength(1);
  });

  it('imports an epub chosen in the browser', async () => {
    stubFileInput();
    const pending = bookLibraryService.importFromPicker();
    choose({
      name: 'hyde.epub',
      arrayBuffer: async () => epubBytes.buffer,
      text: async () => '',
    });

    const book = await pending;

    expect(book).toMatchObject({ format: 'epub', title: 'hyde', source: 'local' });
    expect(book?.id.startsWith('local:')).toBe(true);
    expect(new Uint8Array(await bookLibraryService.readBytes(book!))).toEqual(epubBytes);
  });

  it('imports a txt chosen in the browser', async () => {
    stubFileInput();
    const pending = bookLibraryService.importFromPicker();
    choose({
      name: 'notes.txt',
      arrayBuffer: async () => new Uint8Array([0x68, 0x69]).buffer,
      text: async () => 'Call me Ishmael.',
    });

    const book = await pending;

    expect(book).toMatchObject({ format: 'txt', title: 'notes' });
    expect(await bookLibraryService.readText(book!)).toBe('Call me Ishmael.');
  });

  it('rejects a file the reader cannot open', async () => {
    stubFileInput();
    const pending = bookLibraryService.importFromPicker();
    choose({
      name: 'paper.pdf',
      arrayBuffer: async () => new Uint8Array([0x25, 0x50]).buffer,
      text: async () => '',
    });

    await expect(pending).rejects.toThrow(UNSUPPORTED_BOOK_FORMAT);
  });

  it('resolves a cancelled picker without a book', async () => {
    stubFileInput();
    const pending = bookLibraryService.importFromPicker();
    input.oncancel?.();

    await expect(pending).resolves.toBeNull();
  });

  it('refuses a catalogue download the browser cannot make', async () => {
    await expect(bookLibraryService.download(prideAndPrejudice)).rejects.toThrow(
      DOWNLOAD_UNSUPPORTED,
    );
  });

  it('reports a missing book instead of a filesystem crash', async () => {
    const ghost = {
      id: 'local:none',
      title: 'Gone',
      author: 'UNKNOWN',
      source: 'local' as const,
      format: 'txt' as const,
      fileUri: 'memory://missing.txt',
      sizeBytes: 0,
      pageCount: 0,
      addedAt: '2026-01-01T00:00:00.000Z',
    };

    await expect(bookLibraryService.readText(ghost)).rejects.toThrow(BOOK_NOT_FOUND);
  });
});
