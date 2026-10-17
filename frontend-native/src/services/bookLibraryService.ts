/**
 * Book Library — the on-device shelf.
 *
 * Owns the book files under `document/LextroBooks/` plus the `library.json`
 * index. Downloading uses `File.downloadFileAsync`; importing uses the
 * built-in `File.pickFileAsync` picker (no extra dependency).
 */

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { Book, BookFormat } from '../types/books';
import type { BookResult } from './bookApi';

const LIBRARY_DIR = 'LextroBooks';
const INDEX_NAME = 'library.json';

export const BOOKS_UNSUPPORTED_ON_WEB = 'BOOKS_UNSUPPORTED_ON_WEB';

export function isBookLibrarySupported(): boolean {
  return Platform.OS !== 'web';
}

function assertSupported(): void {
  if (!isBookLibrarySupported()) throw new Error(BOOKS_UNSUPPORTED_ON_WEB);
}

function libraryDir(): Directory {
  assertSupported();
  return new Directory(Paths.document, LIBRARY_DIR);
}

function fileAt(uri: string): File {
  assertSupported();
  return new File(uri);
}

function indexFile(): File {
  return new File(libraryDir(), INDEX_NAME);
}

function ensureLibraryDir(): Directory {
  const dir = libraryDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function detectFormat(nameOrUri: string): BookFormat | null {
  const lower = nameOrUri.toLowerCase().split('?')[0];
  if (lower.endsWith('.epub')) return 'epub';
  if (lower.endsWith('.txt')) return 'txt';
  return null;
}

export function titleFromFileName(nameOrUri: string): string {
  const segment = nameOrUri.split(/[\\/]/).pop() ?? nameOrUri;
  const stripped = segment.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return stripped || 'UNTITLED';
}

export function fileNameFor(book: Pick<Book, 'id' | 'format'>): string {
  return `${book.id.replace(/[^a-zA-Z0-9._-]/g, '_')}.${book.format}`;
}

export function byteLengthOf(content: string | Uint8Array): number {
  return typeof content === 'string' ? content.length : content.byteLength;
}

export function localIdFrom(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  return `local:${hash.toString(16)}`;
}

async function readIndex(): Promise<Book[]> {
  const file = indexFile();
  if (!file.exists) return [];
  try {
    const parsed: unknown = JSON.parse(await file.text());
    return Array.isArray(parsed) ? (parsed as Book[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(books: Book[]): Promise<void> {
  ensureLibraryDir();
  indexFile().write(JSON.stringify(books));
}

class BookLibraryService {
  async list(): Promise<Book[]> {
    const books = await readIndex();
    return [...books].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }

  async get(bookId: string): Promise<Book | null> {
    return (await readIndex()).find((book) => book.id === bookId) ?? null;
  }

  async upsert(book: Book): Promise<void> {
    const books = await readIndex();
    const at = books.findIndex((existing) => existing.id === book.id);
    if (at >= 0) books[at] = book;
    else books.push(book);
    await writeIndex(books);
  }

  async setPageCount(bookId: string, pageCount: number): Promise<void> {
    const books = await readIndex();
    const at = books.findIndex((book) => book.id === bookId);
    if (at < 0) return;
    books[at] = { ...books[at], pageCount };
    await writeIndex(books);
  }

  async remove(bookId: string): Promise<void> {
    const books = await readIndex();
    const book = books.find((existing) => existing.id === bookId);
    if (book?.fileUri) {
      const file = fileAt(book.fileUri);
      if (file.exists) file.delete();
    }
    await writeIndex(books.filter((existing) => existing.id !== bookId));
  }

  async save(book: Book, content: string | Uint8Array): Promise<Book> {
    const file = new File(ensureLibraryDir(), fileNameFor(book));
    file.write(content);
    const stored: Book = {
      ...book,
      fileUri: file.uri,
      sizeBytes: byteLengthOf(content),
    };
    await this.upsert(stored);
    return stored;
  }

  async download(result: BookResult): Promise<Book> {
    const dir = ensureLibraryDir();
    const target = new File(dir, fileNameFor({ id: result.id, format: result.format }));
    if (target.exists) target.delete();
    const downloaded = await File.downloadFileAsync(result.url, target, { idempotent: true });

    const book: Book = {
      id: result.id,
      title: result.title,
      author: result.author,
      source: 'gutenberg',
      format: result.format,
      language: result.language,
      coverUrl: result.coverUrl,
      fileUri: downloaded.uri,
      sizeBytes: downloaded.size || 0,
      pageCount: 0,
      addedAt: new Date().toISOString(),
    };
    await this.upsert(book);
    return book;
  }

  async importFromPicker(): Promise<Book | null> {
    assertSupported();
    const picked = await File.pickFileAsync({
      mimeTypes: ['text/plain', 'application/epub+zip'],
    });
    if (picked.canceled || !picked.result) return null;

    const format = detectFormat(picked.result.uri);
    if (!format) throw new Error('UNSUPPORTED_BOOK_FORMAT');

    const draft: Book = {
      id: localIdFrom(picked.result.uri),
      title: titleFromFileName(picked.result.uri),
      author: 'UNKNOWN',
      source: 'local',
      format,
      fileUri: '',
      sizeBytes: 0,
      pageCount: 0,
      addedAt: new Date().toISOString(),
    };

    const content =
      format === 'epub' ? await picked.result.bytes() : await picked.result.text();
    return this.save(draft, content);
  }

  async readText(book: Book): Promise<string> {
    return fileAt(book.fileUri).text();
  }

  async readBytes(book: Book): Promise<Uint8Array> {
    return fileAt(book.fileUri).bytes();
  }
}

export const bookLibraryService = new BookLibraryService();
export { BookLibraryService };
