/**
 * Book Library — the shelf.
 *
 * Owns the book files plus the `library.json` index. On native both live under
 * `document/LextroBooks/`; on web they are served from memory, and books arrive
 * from the bundled starter title or the browser's own file picker.
 */

import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import type { Book, BookFormat } from '../types/books';
import type { BookResult } from './bookApi';

const LIBRARY_DIR = 'LextroBooks';
const INDEX_NAME = 'library.json';

export const BOOK_NOT_FOUND = 'BOOK_NOT_FOUND';
export const UNSUPPORTED_BOOK_FORMAT = 'UNSUPPORTED_BOOK_FORMAT';
export const DOWNLOAD_UNSUPPORTED = 'DOWNLOAD_UNSUPPORTED';

// Project Gutenberg and Gutendex answer without CORS headers, so a browser page
// cannot fetch them at all — the catalogue is native-only by necessity.
export function isRemoteCatalogueSupported(): boolean {
  return Platform.OS !== 'web';
}

interface StoredFile {
  fileUri: string;
  sizeBytes: number;
}

interface BookStore {
  readIndex(): Promise<Book[]>;
  writeIndex(books: Book[]): Promise<void>;
  writeFile(fileName: string, content: string | Uint8Array): Promise<StoredFile>;
  downloadFile(url: string, fileName: string): Promise<StoredFile>;
  readText(fileUri: string): Promise<string>;
  readBytes(fileUri: string): Promise<Uint8Array>;
  deleteFile(fileUri: string): Promise<void>;
}

interface PickedBook {
  fileName: string;
  format: BookFormat;
  content: string | Uint8Array;
}

interface PickedFileLike {
  uri: string;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
}

interface BrowserFile {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
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

const EPUB_ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

export function detectFormatFromContent(bytes: Uint8Array): BookFormat | null {
  const isZip = EPUB_ZIP_MAGIC.every((byte, index) => bytes[index] === byte);
  return isZip ? 'epub' : null;
}

export function hasUnsupportedExtension(nameOrUri: string): boolean {
  const segment = (nameOrUri.split('?')[0].split(/[\\/]/).pop() ?? '').toLowerCase();
  const dot = segment.lastIndexOf('.');
  if (dot <= 0) return false;
  const extension = segment.slice(dot + 1);
  return extension !== 'epub' && extension !== 'txt';
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

// Android's Downloads provider returns a content:// uri holding a numeric
// document id rather than a file name, so the extension is unreachable here.
async function readPickedFile(
  picked: PickedFileLike,
): Promise<{ format: BookFormat; content: string | Uint8Array }> {
  const byExtension = detectFormat(picked.uri);
  if (byExtension) {
    return {
      format: byExtension,
      content: byExtension === 'epub' ? await picked.bytes() : await picked.text(),
    };
  }
  if (hasUnsupportedExtension(picked.uri)) throw new Error(UNSUPPORTED_BOOK_FORMAT);
  const bytes = await picked.bytes();
  return detectFormatFromContent(bytes) === 'epub'
    ? { format: 'epub', content: bytes }
    : { format: 'txt', content: await picked.text() };
}

async function pickOnNative(): Promise<PickedBook | null> {
  const picked = await File.pickFileAsync({
    mimeTypes: ['text/plain', 'application/epub+zip'],
  });
  if (picked.canceled || !picked.result) return null;
  const file = picked.result;
  return { fileName: file.uri, ...(await readPickedFile(file)) };
}

async function readBrowserFile(file: BrowserFile): Promise<PickedBook> {
  if (hasUnsupportedExtension(file.name)) throw new Error(UNSUPPORTED_BOOK_FORMAT);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectFormat(file.name) ?? detectFormatFromContent(bytes) ?? 'txt';
  return {
    fileName: file.name,
    format,
    content: format === 'epub' ? bytes : await file.text(),
  };
}

function pickOnWeb(): Promise<PickedBook | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.epub,.txt,text/plain,application/epub+zip';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      readBrowserFile(file).then(resolve, reject);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

class NativeBookStore implements BookStore {
  private libraryDir(): Directory {
    return new Directory(Paths.document, LIBRARY_DIR);
  }

  private ensureLibraryDir(): Directory {
    const dir = this.libraryDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    return dir;
  }

  private indexFile(): File {
    return new File(this.libraryDir(), INDEX_NAME);
  }

  async readIndex(): Promise<Book[]> {
    const file = this.indexFile();
    if (!file.exists) return [];
    try {
      const parsed: unknown = JSON.parse(await file.text());
      return Array.isArray(parsed) ? (parsed as Book[]) : [];
    } catch {
      return [];
    }
  }

  async writeIndex(books: Book[]): Promise<void> {
    this.ensureLibraryDir();
    this.indexFile().write(JSON.stringify(books));
  }

  async writeFile(fileName: string, content: string | Uint8Array): Promise<StoredFile> {
    const file = new File(this.ensureLibraryDir(), fileName);
    file.write(content);
    return { fileUri: file.uri, sizeBytes: byteLengthOf(content) };
  }

  async downloadFile(url: string, fileName: string): Promise<StoredFile> {
    const target = new File(this.ensureLibraryDir(), fileName);
    if (target.exists) target.delete();
    const downloaded = await File.downloadFileAsync(url, target, { idempotent: true });
    return { fileUri: downloaded.uri, sizeBytes: downloaded.size || 0 };
  }

  async readText(fileUri: string): Promise<string> {
    return new File(fileUri).text();
  }

  async readBytes(fileUri: string): Promise<Uint8Array> {
    return new File(fileUri).bytes();
  }

  async deleteFile(fileUri: string): Promise<void> {
    const file = new File(fileUri);
    if (file.exists) file.delete();
  }
}

class BrowserBookStore implements BookStore {
  private index: Book[] = [];
  private files = new Map<string, string | Uint8Array>();

  async readIndex(): Promise<Book[]> {
    return [...this.index];
  }

  async writeIndex(books: Book[]): Promise<void> {
    this.index = [...books];
  }

  async writeFile(fileName: string, content: string | Uint8Array): Promise<StoredFile> {
    const fileUri = `memory://${fileName}`;
    this.files.set(fileUri, content);
    return { fileUri, sizeBytes: byteLengthOf(content) };
  }

  downloadFile(): Promise<StoredFile> {
    return Promise.reject(new Error(DOWNLOAD_UNSUPPORTED));
  }

  async readText(fileUri: string): Promise<string> {
    const content = this.contentAt(fileUri);
    return typeof content === 'string' ? content : new TextDecoder().decode(content);
  }

  async readBytes(fileUri: string): Promise<Uint8Array> {
    const content = this.contentAt(fileUri);
    return typeof content === 'string' ? new TextEncoder().encode(content) : content;
  }

  async deleteFile(fileUri: string): Promise<void> {
    this.files.delete(fileUri);
  }

  private contentAt(fileUri: string): string | Uint8Array {
    const content = this.files.get(fileUri);
    if (!content) throw new Error(BOOK_NOT_FOUND);
    return content;
  }
}

const store: BookStore = Platform.OS === 'web' ? new BrowserBookStore() : new NativeBookStore();

const STARTER_BOOK_ID = 'gutenberg:43';
const STARTER_TEXT_ASSET = require('../../assets/books/jekyll-and-hyde.txt');
const STARTER_COVER_ASSET = require('../../assets/books/jekyll-and-hyde-cover.jpg');

async function resolveAssetUri(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

async function readAssetText(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (Platform.OS !== 'web') return new File(uri).text();
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`BOOK_ASSET_${response.status}`);
  return response.text();
}

class BookLibraryService {
  async list(): Promise<Book[]> {
    const books = await store.readIndex();
    return [...books].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }

  async get(bookId: string): Promise<Book | null> {
    return (await store.readIndex()).find((book) => book.id === bookId) ?? null;
  }

  async upsert(book: Book): Promise<void> {
    const books = await store.readIndex();
    const at = books.findIndex((existing) => existing.id === book.id);
    if (at >= 0) books[at] = book;
    else books.push(book);
    await store.writeIndex(books);
  }

  async setPageCount(bookId: string, pageCount: number): Promise<void> {
    const books = await store.readIndex();
    const at = books.findIndex((existing) => existing.id === bookId);
    if (at < 0) return;
    books[at] = { ...books[at], pageCount };
    await store.writeIndex(books);
  }

  async remove(bookId: string): Promise<void> {
    const books = await store.readIndex();
    const book = books.find((existing) => existing.id === bookId);
    if (book?.fileUri) await store.deleteFile(book.fileUri);
    await store.writeIndex(books.filter((existing) => existing.id !== bookId));
  }

  async save(book: Book, content: string | Uint8Array): Promise<Book> {
    const stored: Book = { ...book, ...(await store.writeFile(fileNameFor(book), content)) };
    await this.upsert(stored);
    return stored;
  }

  async download(result: BookResult): Promise<Book> {
    const draft: Book = {
      id: result.id,
      title: result.title,
      author: result.author,
      source: 'gutenberg',
      format: result.format,
      language: result.language,
      coverUrl: result.coverUrl,
      fileUri: '',
      sizeBytes: 0,
      pageCount: 0,
      addedAt: new Date().toISOString(),
    };
    const stored: Book = {
      ...draft,
      ...(await store.downloadFile(result.url, fileNameFor(draft))),
    };
    await this.upsert(stored);
    return stored;
  }

  async importFromPicker(): Promise<Book | null> {
    const picked = Platform.OS === 'web' ? await pickOnWeb() : await pickOnNative();
    if (!picked) return null;

    const draft: Book = {
      id: localIdFrom(picked.fileName),
      title: titleFromFileName(picked.fileName),
      author: 'UNKNOWN',
      source: 'local',
      format: picked.format,
      fileUri: '',
      sizeBytes: 0,
      pageCount: 0,
      addedAt: new Date().toISOString(),
    };

    return this.save(draft, picked.content);
  }

  async ensureStarterBook(): Promise<Book | null> {
    const existing = await this.get(STARTER_BOOK_ID);
    if (existing) return existing;

    const draft: Book = {
      id: STARTER_BOOK_ID,
      title: 'The Strange Case of Dr. Jekyll and Mr. Hyde',
      author: 'Robert Louis Stevenson',
      source: 'gutenberg',
      format: 'txt',
      language: 'en',
      coverUrl: await resolveAssetUri(STARTER_COVER_ASSET),
      fileUri: '',
      sizeBytes: 0,
      pageCount: 0,
      addedAt: new Date().toISOString(),
    };

    return this.save(draft, await readAssetText(STARTER_TEXT_ASSET));
  }

  async readText(book: Book): Promise<string> {
    return store.readText(book.fileUri);
  }

  async readBytes(book: Book): Promise<Uint8Array> {
    return store.readBytes(book.fileUri);
  }
}

export const bookLibraryService = new BookLibraryService();
export { BookLibraryService };
