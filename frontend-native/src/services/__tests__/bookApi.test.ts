import { resolveFormat, toBookResult, popularGutendex } from '../bookApi';

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

describe('popularGutendex', () => {
  const originalFetch = globalThis.fetch;

  const stubFetch = (payload: unknown, ok = true) => {
    const mock = jest
      .fn()
      .mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => payload });
    globalThis.fetch = mock as unknown as typeof fetch;
    return mock;
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('relies on the default most-downloaded ordering instead of a sort param', async () => {
    const mock = stubFetch({ results: [] });
    await popularGutendex(2);
    const url = String(mock.mock.calls[0][0]);
    expect(url).toContain('page=2');
    expect(url).not.toContain('sort=');
  });

  it('maps readable results and drops unreadable ones', async () => {
    stubFetch({
      results: [
        {
          id: 1342,
          title: 'Pride and Prejudice',
          authors: [{ name: 'Austen, Jane' }],
          download_count: 190246,
          formats: { 'application/epub+zip': 'http://x/1342.epub' },
        },
        { id: 9, title: 'No Readable Format', formats: { 'text/html': 'http://x/9.html' } },
      ],
    });

    const results = await popularGutendex();

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'gutenberg:1342',
      format: 'epub',
      downloadCount: 190246,
    });
  });

  it('throws a coded error when the catalogue rejects the request', async () => {
    stubFetch({}, false);
    await expect(popularGutendex()).rejects.toThrow('GUTENDEX_503');
  });
});
