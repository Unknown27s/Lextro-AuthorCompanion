/**
 * Book API — Gutendex (Project Gutenberg) metadata client.
 * Network only; downloading files is bookLibraryService's job.
 */

import type { BookFormat } from '../types/books';

const GUTENDEX_BASE = 'https://gutendex.com/books';

export interface BookResult {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  url: string;
  coverUrl?: string;
  language?: string;
  downloadCount: number;
}

export interface GutendexBook {
  id: number;
  title: string;
  authors?: { name: string }[];
  languages?: string[];
  download_count?: number;
  formats?: Record<string, string>;
}

/** Pick the best readable format: EPUB > UTF-8 text > us-ascii text. */
export function resolveFormat(formats: Record<string, string>): { format: BookFormat; url: string } | null {
  if (formats['application/epub+zip']) {
    return { format: 'epub', url: formats['application/epub+zip'] };
  }
  const utf8 = formats['text/plain; charset=utf-8'];
  if (utf8) return { format: 'txt', url: utf8 };
  const ascii = formats['text/plain; charset=us-ascii'];
  if (ascii) return { format: 'txt', url: ascii };
  return null;
}

/** Map a raw Gutendex record to our BookResult, or null when unreadable. */
export function toBookResult(raw: GutendexBook): BookResult | null {
  const resolved = resolveFormat(raw.formats ?? {});
  if (!resolved) return null;
  return {
    id: `gutenberg:${raw.id}`,
    title: raw.title ?? 'UNTITLED',
    author: raw.authors?.[0]?.name ?? 'UNKNOWN',
    format: resolved.format,
    url: resolved.url,
    coverUrl: raw.formats?.['image/jpeg'],
    language: raw.languages?.[0],
    downloadCount: raw.download_count ?? 0,
  };
}

async function fetchResults(url: string): Promise<BookResult[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GUTENDEX_${response.status}`);
  const data = (await response.json()) as { results?: GutendexBook[] };
  return (data.results ?? [])
    .map(toBookResult)
    .filter((r): r is BookResult => r !== null);
}

export function searchGutendex(query: string, page = 1): Promise<BookResult[]> {
  const params = new URLSearchParams({ search: query, page: String(page) });
  return fetchResults(`${GUTENDEX_BASE}?${params.toString()}`);
}

export function browseGutendex(topic: string, page = 1): Promise<BookResult[]> {
  const params = new URLSearchParams({ topic, page: String(page) });
  return fetchResults(`${GUTENDEX_BASE}?${params.toString()}`);
}

export function popularGutendex(page = 1): Promise<BookResult[]> {
  const params = new URLSearchParams({ sort: 'popular', page: String(page) });
  return fetchResults(`${GUTENDEX_BASE}?${params.toString()}`);
}
