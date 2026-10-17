import { resolveFormat, toBookResult } from '../bookApi';

describe('resolveFormat', () => {
  it('prefers EPUB over plain text', () => {
    const result = resolveFormat({
      'text/plain; charset=utf-8': 'http://x/book.txt',
      'application/epub+zip': 'http://x/book.epub',
    });
    expect(result).toEqual({ format: 'epub', url: 'http://x/book.epub' });
  });

  it('falls back to plain text when no epub exists', () => {
    const result = resolveFormat({ 'text/plain; charset=utf-8': 'http://x/book.txt' });
    expect(result).toEqual({ format: 'txt', url: 'http://x/book.txt' });
  });

  it('returns null when only html is available', () => {
    expect(resolveFormat({ 'text/html': 'http://x/book.html' })).toBeNull();
  });
});

describe('toBookResult', () => {
  it('maps a gutendex payload to a book result', () => {
    const result = toBookResult({
      id: 1342,
      title: 'Pride and Prejudice',
      authors: [{ name: 'Austen, Jane' }],
      languages: ['en'],
      download_count: 60000,
      formats: {
        'application/epub+zip': 'http://x/1342.epub',
        'image/jpeg': 'http://x/1342.jpg',
      },
    });
    expect(result).toMatchObject({
      id: 'gutenberg:1342',
      title: 'Pride and Prejudice',
      author: 'Austen, Jane',
      format: 'epub',
      url: 'http://x/1342.epub',
      coverUrl: 'http://x/1342.jpg',
      language: 'en',
    });
  });

  it('returns null when no readable format exists', () => {
    expect(toBookResult({ id: 1, title: 'X', formats: { 'text/html': 'http://x' } })).toBeNull();
  });
});
