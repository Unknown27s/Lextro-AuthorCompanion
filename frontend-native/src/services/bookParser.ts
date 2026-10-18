/**
 * Book Parser — turns raw book text into chapters and deterministic pages.
 *
 * Pure and synchronous for TXT. EPUB (Phase 3) unzips via JSZip and feeds the
 * same chapter/page pipeline, so both formats share pagination.
 */

import JSZip from 'jszip';
import type { BookPage, Chapter } from '../types/books';

export const WORDS_PER_PAGE = 220;
const HEADING_RE = /^\s*(CHAPTER|PART|BOOK|LETTER|EPILOGUE|PROLOGUE)\s+([IVXLCDM]+|\d+)\b.*$/i;
const GUTENBERG_START_MARKER = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;
const GUTENBERG_END_MARKER = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;

export interface RawChapter {
  title: string;
  text: string;
}

/** Remove the standard Project Gutenberg header/footer blocks if present. */
export function stripGutenbergBoilerplate(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n');
  const startMatch = GUTENBERG_START_MARKER.exec(normalized);
  if (!startMatch) return normalized;

  const afterStart = normalized.slice(startMatch.index + startMatch[0].length);
  const endMatch = GUTENBERG_END_MARKER.exec(afterStart);
  return endMatch ? afterStart.slice(0, endMatch.index) : afterStart;
}

/**
 * Heading test for an already-trimmed line. Alongside numbered divisions
 * ("CHAPTER IV"), a bare upper-case line is a title ("STORY OF THE DOOR"),
 * because running prose is sentence-cased and so never matches. A table of
 * contents repeats those titles, but every entry is immediately followed by
 * another heading, so the empty chapter it opens is discarded by `flush`.
 */
function isChapterHeading(line: string): boolean {
  if (!line || line.length > 80) return false;
  if (HEADING_RE.test(line)) return true;
  if (/[a-z]/.test(line) || !/[A-Z]/.test(line)) return false;
  if (/[.!?,;:]\s*$/.test(line)) return false;
  const words = line.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 12;
}

/** Split normalized text into chapters on heading lines; fall back to one TEXT chapter. */
export function splitIntoChapters(raw: string): RawChapter[] {
  const clean = stripGutenbergBoilerplate(raw);
  const lines = clean.split('\n');
  const chapters: RawChapter[] = [];
  let current: string[] | null = null;
  let currentTitle = 'TEXT';

  const flush = () => {
    if (current) {
      const text = current.join('\n').trim();
      if (text) chapters.push({ title: currentTitle, text });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (isChapterHeading(trimmed)) {
      flush();
      currentTitle = trimmed.toUpperCase();
      current = [];
      continue;
    }
    if (current === null) {
      currentTitle = 'TEXT';
      current = [];
    }
    current.push(line);
  }
  flush();

  return chapters.length > 0 ? chapters : [{ title: 'TEXT', text: clean.trim() }];
}

/** Split chapters into pages of exactly WORDS_PER_PAGE words (except the last). */
export function paginateChapters(bookId: string, chapters: RawChapter[]): BookPage[] {
  const pages: BookPage[] = [];
  let globalIndex = 0;

  chapters.forEach((chapter, chapterIndex) => {
    const tokens = chapter.text.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;
    for (let i = 0; i < tokens.length; i += WORDS_PER_PAGE) {
      const slice = tokens.slice(i, i + WORDS_PER_PAGE);
      pages.push({
        bookId,
        index: globalIndex,
        chapterIndex,
        chapterTitle: chapter.title,
        text: slice.join(' '),
        wordCount: slice.length,
      });
      globalIndex += 1;
    }
  });

  return pages;
}

/** Derive the per-chapter page ranges from a paginated list. */
export function buildChapterIndex(pages: BookPage[]): Chapter[] {
  const chapters: Chapter[] = [];
  for (const page of pages) {
    const title = page.chapterTitle ?? `CHAPTER ${page.chapterIndex + 1}`;
    const last = chapters[chapters.length - 1];
    if (last && last.index === page.chapterIndex) {
      last.pageCount += 1;
    } else {
      chapters.push({
        index: page.chapterIndex,
        title,
        startPage: page.index,
        pageCount: 1,
      });
    }
  }
  return chapters;
}

/** Parse a TXT book end-to-end. */
export function parseTxt(
  bookId: string,
  raw: string,
): { pages: BookPage[]; chapters: Chapter[] } {
  const chapters = splitIntoChapters(raw);
  const pages = paginateChapters(bookId, chapters);
  return { pages, chapters: buildChapterIndex(pages) };
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#')) {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstHeading(html: string): string | null {
  const match = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(html);
  if (!match) return null;
  const text = htmlToText(match[1]);
  return text ? text.slice(0, 80).toUpperCase() : null;
}

function attr(tag: string, name: string): string | null {
  return new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag)?.[1] ?? null;
}

/**
 * Gutenberg keeps its header in the first spine document and its licence in the
 * last, so the markers only line up when the documents are walked in order.
 * Sections that fall outside the markers are dropped; a source without markers
 * is returned untouched.
 */
function stripEpubBoilerplate(chapters: RawChapter[]): RawChapter[] {
  const kept: RawChapter[] = [];
  let seenStart = false;

  for (const chapter of chapters) {
    let text = chapter.text;

    if (!seenStart) {
      const start = GUTENBERG_START_MARKER.exec(text);
      if (!start) continue;
      seenStart = true;
      text = text.slice(start.index + start[0].length);
    }

    const end = GUTENBERG_END_MARKER.exec(text);
    if (end) {
      const body = text.slice(0, end.index).trim();
      if (body) kept.push({ ...chapter, text: body });
      return kept;
    }

    const body = text.trim();
    if (body) kept.push({ ...chapter, text: body });
  }

  return seenStart ? kept : chapters;
}

/**
 * Parse an EPUB: unzip, walk the spine in order, flatten each XHTML document to
 * plain text, then reuse the shared pagination pipeline.
 */
export async function parseEpub(
  bookId: string,
  bytes: Uint8Array,
): Promise<{ pages: BookPage[]; chapters: Chapter[] }> {
  const zip = await JSZip.loadAsync(bytes);

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('EPUB_INVALID: missing META-INF/container.xml');
  const containerXml = await containerFile.async('string');

  const opfPath = attr(containerXml, 'full-path');
  if (!opfPath) throw new Error('EPUB_INVALID: container has no rootfile');
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`EPUB_INVALID: missing package document ${opfPath}`);
  const opf = await opfFile.async('string');

  const baseDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';

  const hrefById = new Map<string, string>();
  for (const match of opf.matchAll(/<item\b[^>]*>/gi)) {
    const id = attr(match[0], 'id');
    const href = attr(match[0], 'href');
    if (id && href) hrefById.set(id, href);
  }

  const spineBlock = /<spine\b[^>]*>([\s\S]*?)<\/spine>/i.exec(opf)?.[1] ?? '';
  const spineOrder = Array.from(spineBlock.matchAll(/<itemref\b[^>]*>/gi))
    .map((match) => attr(match[0], 'idref'))
    .filter((idref): idref is string => idref !== null);

  const rawChapters: RawChapter[] = [];
  for (const idref of spineOrder) {
    const href = hrefById.get(idref);
    if (!href) continue;
    const entry = zip.file(baseDir + href) ?? zip.file(href);
    if (!entry) continue;
    const html = await entry.async('string');
    const text = htmlToText(html);
    if (!text) continue;
    rawChapters.push({
      title: firstHeading(html) ?? `SECTION ${rawChapters.length + 1}`,
      text,
    });
  }

  const content = stripEpubBoilerplate(rawChapters);
  if (content.length === 0) throw new Error('EPUB_INVALID: no readable spine content');

  const pages = paginateChapters(bookId, content);
  return { pages, chapters: buildChapterIndex(pages) };
}
