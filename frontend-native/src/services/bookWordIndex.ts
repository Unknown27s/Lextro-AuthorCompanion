/**
 * Book Word Index — every word on every page, plus a searchable index.
 *
 * Deliberately has NO difficulty filtering and NO stoplist: the vocabulary
 * view shows all words on a page. All pure functions.
 */

import type { BookPage, PageWord, WordHit } from '../types/books';

export const MIN_WORD_LENGTH = 2;
const TOKEN_RE = /[A-Za-z][A-Za-z'-]*/g;
const EDGE_RE = /^['-]+|['-]+$/g;

/** Lowercase, strip wrapping punctuation; null when the token is too short. */
export function normalizeToken(raw: string): string | null {
  const cleaned = raw.toLowerCase().replace(EDGE_RE, '');
  return cleaned.length >= MIN_WORD_LENGTH ? cleaned : null;
}

/** Lowercase alphabetic tokens; drops tokens shorter than MIN_WORD_LENGTH. */
export function tokenize(text: string): string[] {
  const matches = text.match(TOKEN_RE) ?? [];
  return matches
    .map(normalizeToken)
    .filter((token): token is string => token !== null);
}

/** Per-page distinct words with occurrence counts. */
export function buildWordIndex(pages: BookPage[]): PageWord[] {
  const index: PageWord[] = [];
  for (const page of pages) {
    const counts = new Map<string, number>();
    for (const word of tokenize(page.text)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    for (const [word, count] of counts) {
      index.push({ word, pageIndex: page.index, chapterIndex: page.chapterIndex, count });
    }
  }
  return index;
}

/** Search the index: exact match first, then prefix, then substring. */
export function searchWords(index: PageWord[], query: string): WordHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const pagesByWord = new Map<string, Set<number>>();
  const firstSeen = new Map<string, number>();
  let order = 0;
  for (const entry of index) {
    if (!entry.word.includes(q)) continue;
    if (!pagesByWord.has(entry.word)) {
      pagesByWord.set(entry.word, new Set());
      firstSeen.set(entry.word, order);
      order += 1;
    }
    pagesByWord.get(entry.word)!.add(entry.pageIndex);
  }

  const rank = (word: string): number => (word === q ? 0 : word.startsWith(q) ? 1 : 2);

  return Array.from(pagesByWord.entries())
    .map(([word, pageSet]) => ({
      word,
      pageIndexes: Array.from(pageSet).sort((a, b) => a - b),
    }))
    .sort(
      (a, b) =>
        rank(a.word) - rank(b.word) ||
        (firstSeen.get(a.word) ?? 0) - (firstSeen.get(b.word) ?? 0),
    );
}

/** Words belonging to a single page, ordered by frequency then alphabetically. */
export function wordsForPage(index: PageWord[], pageIndex: number): PageWord[] {
  return index
    .filter((entry) => entry.pageIndex === pageIndex)
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}
