/**
 * Books Screen — Type Foundry
 *
 * Route owner for the BOOKS tab: the on-device shelf (import + download), a
 * Gutendex catalogue browser, and the hand-off into the paginated Reader.
 * Word taps reuse the shared WordDetailModal.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenShell from '../components/ScreenShell';
import WordDetailModal from '../components/WordDetailModal';
import { BookCover } from '../components/books/BookCover';
import { Reader } from '../components/books/Reader';
import { colors, fonts, spacing, typeScale } from '../theme';
import { localStorageApi } from '../api/client';
import { sqliteService } from '../services/sqliteService';
import { bookmarkService } from '../services/bookmarkService';
import { bookLibraryService, isBookLibrarySupported } from '../services/bookLibraryService';
import { bookReaderService } from '../services/bookReaderService';
import { popularGutendex, searchGutendex } from '../services/bookApi';
import type { BookResult } from '../services/bookApi';
import type { Book, BookPage } from '../types/books';
import type { VocabItem as VocabItemType } from '../types';

interface OpenBook {
  book: Book;
  pages: BookPage[];
  startPage: number;
}

const POPULAR_LIMIT = 6;

function formatSize(bytes: number): string {
  if (bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDownloads(count: number): string {
  return count >= 1000 ? `${Math.round(count / 1000)}K` : String(count);
}

function toVocabItem(word: string, row: Record<string, unknown> | null): VocabItemType {
  if (!row) {
    return {
      id: word.toLowerCase(),
      word,
      pos: 'word',
      difficulty: 'medium',
      definition: '',
      example_corpus: '',
      ai_example: '',
      synonyms: [],
      tags: [],
      created_at: '',
    };
  }
  const rawDifficulty = row.difficulty;
  const difficulty: VocabItemType['difficulty'] =
    rawDifficulty === 'easy' || rawDifficulty === 'hard' ? rawDifficulty : 'medium';
  return {
    id: String(row.word).toLowerCase(),
    word: String(row.word),
    pos: String(row.pos ?? 'word'),
    difficulty,
    definition: String(row.definition ?? ''),
    example_corpus: String(row.example_corpus ?? ''),
    ai_example: String(row.ai_example ?? ''),
    synonyms: Array.isArray(row.synonyms) ? (row.synonyms as string[]) : [],
    antonyms: Array.isArray(row.antonyms) ? (row.antonyms as string[]) : [],
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    created_at: String(row.created_at ?? ''),
  };
}

export default function BooksScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [popular, setPopular] = useState<BookResult[]>([]);
  const [query, setQuery] = useState('');
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [results, setResults] = useState<BookResult[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openBook, setOpenBook] = useState<OpenBook | null>(null);
  const [detailWord, setDetailWord] = useState<VocabItemType | null>(null);
  const [activeWord, setActiveWord] = useState<string | null>(null);

  const librarySupported = isBookLibrarySupported();

  const refresh = useCallback(async () => {
    if (!isBookLibrarySupported()) return;
    setBooks(await bookLibraryService.list());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!librarySupported) return;
    let cancelled = false;
    popularGutendex(1)
      .then((results) => {
        if (!cancelled) setPopular(results.slice(0, POPULAR_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setPopular([]);
      });
    return () => {
      cancelled = true;
    };
  }, [librarySupported]);

  const shelf = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return books;
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(needle) || book.author.toLowerCase().includes(needle),
    );
  }, [books, query]);

  const runBusy = useCallback(async (label: string, work: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SOMETHING WENT WRONG');
    } finally {
      setBusy(null);
    }
  }, []);

  const openReader = useCallback(async (book: Book) => {
    await runBusy('OPENING…', async () => {
      const parsed = await bookReaderService.load(book);
      if (book.pageCount !== parsed.pages.length) {
        await bookLibraryService.setPageCount(book.id, parsed.pages.length);
      }
      const startPage = bookmarkService.getPosition(book.id)?.pageIndex ?? 0;
      setOpenBook({ book, pages: parsed.pages, startPage });
    });
  }, [runBusy]);

  const handleImport = useCallback(() => {
    runBusy('IMPORTING…', async () => {
      const book = await bookLibraryService.importFromPicker();
      if (!book) return;
      const parsed = await bookReaderService.load(book);
      const chapterTitle = parsed.chapters[0]?.title?.trim();
      const titled: Book =
        /[A-Za-z]/.test(book.title) || !chapterTitle ? book : { ...book, title: chapterTitle };
      if (titled !== book) await bookLibraryService.upsert(titled);
      await bookLibraryService.setPageCount(titled.id, parsed.pages.length);
      await refresh();
    });
  }, [refresh, runBusy]);

  const handleDiscover = useCallback(() => {
    const needle = discoverQuery.trim();
    if (!needle) return;
    runBusy('SEARCHING…', async () => {
      setResults(await searchGutendex(needle));
    });
  }, [discoverQuery, runBusy]);

  const handleDownload = useCallback(
    (result: BookResult) => {
      runBusy('DOWNLOADING…', async () => {
        const book = await bookLibraryService.download(result);
        const parsed = await bookReaderService.load(book);
        await bookLibraryService.setPageCount(book.id, parsed.pages.length);
        await refresh();
      });
    },
    [refresh, runBusy],
  );

  const handleRemove = useCallback(
    (book: Book) => {
      Alert.alert('REMOVE BOOK', `Delete “${book.title}” from this device?`, [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'REMOVE',
          style: 'destructive',
          onPress: () =>
            runBusy('REMOVING…', async () => {
              bookReaderService.invalidate(book.id);
              await bookLibraryService.remove(book.id);
              await refresh();
            }),
        },
      ]);
    },
    [refresh, runBusy],
  );

  const handleWordPress = useCallback(async (word: string) => {
    setActiveWord(word);
    const row = await sqliteService.getWord(word);
    setDetailWord(toVocabItem(word, row as Record<string, unknown> | null));
  }, []);

  const handleSaveWord = useCallback(
    (id: string, item?: VocabItemType) => {
      const target = item ?? detailWord;
      if (!target) return;
      const existing = localStorageApi
        .getUserVocab()
        .find((entry) => entry.vocab_item.word.toLowerCase() === target.word.toLowerCase());
      if (existing) {
        localStorageApi.removeVocab(existing.id);
      } else {
        localStorageApi.saveVocab(id, target, 'saved');
      }
    },
    [detailWord],
  );

  if (!librarySupported) {
    return (
      <ScreenShell>
        <View style={styles.topBar}>
          <Text style={styles.topBarLabel}>[BOOKS]</Text>
          <Text style={styles.topBarTitle}>READING ROOM</Text>
        </View>
        <View style={styles.unsupported}>
          <Text style={styles.unsupportedTitle}>DESKTOP PREVIEW</Text>
          <Text style={styles.unsupportedBody}>
            The reading room keeps its books on the device. Downloading, importing and reading
            work in the Lextro app on Android and iOS.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  if (openBook) {
    return (
      <React.Fragment>
        <Reader
          book={openBook.book}
          pages={openBook.pages}
          startPage={openBook.startPage}
          activeWord={activeWord}
          onWordPress={handleWordPress}
          onClose={() => {
            setOpenBook(null);
            setActiveWord(null);
            setDetailWord(null);
            refresh();
          }}
        />
        {detailWord && (
          <WordDetailModal
            item={detailWord}
            isSaved={localStorageApi
              .getUserVocab()
              .some(
                (entry) => entry.vocab_item.word.toLowerCase() === detailWord.word.toLowerCase(),
              )}
            onClose={() => {
              setDetailWord(null);
              setActiveWord(null);
            }}
            onSave={handleSaveWord}
            onPractice={() => setDetailWord(null)}
            onUseInDocument={() => setDetailWord(null)}
          />
        )}
      </React.Fragment>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.topBar}>
        <Text style={styles.topBarLabel}>[BOOKS]</Text>
        <Text style={styles.topBarTitle}>READING ROOM</Text>
        <Text style={styles.topBarCount}>{String(books.length).padStart(3, '0')}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={handleImport}
          disabled={busy !== null}
          style={[styles.primaryBtn, busy !== null && styles.btnDisabled]}
          accessibilityLabel="Import a book file"
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>＋ IMPORT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDiscoverOpen((open) => !open)}
          style={[styles.outlineBtn, discoverOpen && styles.outlineBtnActive]}
          accessibilityLabel="Browse the catalogue"
          activeOpacity={0.8}
        >
          <Text style={[styles.outlineBtnText, discoverOpen && styles.outlineBtnTextActive]}>
            ⌕ CATALOGUE
          </Text>
        </TouchableOpacity>
      </View>

      {busy && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={styles.statusText}>{busy}</Text>
        </View>
      )}
      {error && <Text style={styles.errorText}>⚠ {error}</Text>}

      {discoverOpen && (
        <View style={styles.discover}>
          <View style={styles.searchRow}>
            <TextInput
              value={discoverQuery}
              onChangeText={setDiscoverQuery}
              onSubmitEditing={handleDiscover}
              placeholder="SEARCH PROJECT GUTENBERG"
              placeholderTextColor={colors.onSurfaceVariant}
              style={styles.search}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search the catalogue"
            />
            <TouchableOpacity
              onPress={handleDiscover}
              style={styles.searchBtn}
              accessibilityLabel="Run catalogue search"
              activeOpacity={0.8}
            >
              <Text style={styles.searchBtnText}>GO</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.resultScroll} keyboardShouldPersistTaps="handled">
            {results.map((result) => (
              <View key={result.id} style={styles.resultRow}>
                <BookCover uri={result.coverUrl} format={result.format} />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {result.title}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {result.author.toUpperCase()} · {result.format.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDownload(result)}
                  disabled={busy !== null}
                  style={[styles.smallBtn, busy !== null && styles.btnDisabled]}
                  accessibilityLabel={`Download ${result.title}`}
                  activeOpacity={0.8}
                >
                  <Text style={styles.smallBtnText}>↓ GET</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="FILTER SHELF"
          placeholderTextColor={colors.onSurfaceVariant}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Filter your shelf"
        />
      </View>

      <ScrollView
        style={styles.shelf}
        contentContainerStyle={styles.shelfContent}
        showsVerticalScrollIndicator={false}
      >
        {shelf.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {books.length === 0 ? 'NO BOOKS YET' : 'NO MATCHES'}
            </Text>
            <Text style={styles.emptyText}>
              {books.length === 0
                ? 'Import a file or browse the catalogue to start reading and collect vocabulary as you go.'
                : 'No books match that filter.'}
            </Text>
            {books.length === 0 && popular.length > 0 && (
              <View style={styles.suggestions}>
                <Text style={styles.suggestTitle}>POPULAR ON GUTENBERG</Text>
                {popular.map((result) => (
                  <View key={result.id} style={styles.resultRow}>
                    <BookCover uri={result.coverUrl} format={result.format} />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle} numberOfLines={2}>
                        {result.title}
                      </Text>
                      <Text style={styles.resultMeta}>
                        {result.author.toUpperCase()} · {result.format.toUpperCase()} ·{' '}
                        {formatDownloads(result.downloadCount)} DL
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDownload(result)}
                      disabled={busy !== null}
                      style={[styles.smallBtn, busy !== null && styles.btnDisabled]}
                      accessibilityLabel={`Download ${result.title}`}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.smallBtnText}>↓ GET</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          shelf.map((book) => {
            const progress = Math.round(bookmarkService.progressFor(book.id) * 100);
            return (
              <TouchableOpacity
                key={book.id}
                onPress={() => openReader(book)}
                onLongPress={() => handleRemove(book)}
                style={styles.bookRow}
                accessibilityLabel={`Open ${book.title}`}
                activeOpacity={0.85}
              >
                <BookCover uri={book.coverUrl} format={book.format} />
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.bookMeta}>
                    {book.author.toUpperCase()} · {book.format.toUpperCase()} ·{' '}
                    {formatSize(book.sizeBytes)} · {book.pageCount || '—'} PP
                  </Text>
                  <View style={styles.bookProgressTrack}>
                    <View style={[styles.bookProgressFill, { width: `${progress}%` }]} />
                  </View>
                </View>
                <View style={styles.bookRight}>
                  <Text style={styles.bookProgressLabel}>{progress}%</Text>
                  {progress > 0 ? (
                    <Text style={styles.continueTag}>▶ CONTINUE</Text>
                  ) : (
                    <Text style={styles.newTag}>NEW</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
  },
  topBarLabel: { ...typeScale.specimenIndex, color: colors.onSurfaceVariant },
  topBarTitle: { ...typeScale.labelMono, color: colors.onSurface, letterSpacing: 2 },
  topBarCount: { ...typeScale.specimenIndex, color: colors.secondary },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
  },
  primaryBtn: {
    borderWidth: spacing.hairline,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryBtnText: { ...typeScale.labelMono, color: colors.onPrimary },
  outlineBtn: {
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outlineBtnActive: { borderColor: colors.secondary, backgroundColor: colors.selectedContainer },
  outlineBtnText: { ...typeScale.labelMono, color: colors.onSurface },
  outlineBtnTextActive: { color: colors.secondary },
  btnDisabled: { opacity: 0.4 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
  },
  statusText: { ...typeScale.specimenIndex, color: colors.onSurfaceVariant },
  errorText: {
    ...typeScale.specimenIndex,
    color: colors.error,
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
  },
  discover: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
  },
  search: {
    flex: 1,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.onSurface,
    backgroundColor: colors.surfaceLowest,
  },
  searchBtn: {
    borderWidth: spacing.hairline,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBtnText: { ...typeScale.labelMono, color: colors.onPrimary },
  resultScroll: { maxHeight: 220, marginTop: 8 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outlineFaint,
  },
  resultInfo: { flex: 1 },
  resultTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.onSurface },
  resultMeta: { ...typeScale.specimenIndex, color: colors.onSurfaceVariant, marginTop: 2 },
  smallBtn: {
    borderWidth: spacing.hairline,
    borderColor: colors.secondary,
    borderRadius: spacing.radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallBtnText: { ...typeScale.labelMono, color: colors.secondary },
  shelf: { flex: 1, marginTop: 8 },
  shelfContent: { paddingHorizontal: spacing.gutter, paddingBottom: 32 },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outlineVariant,
  },
  bookInfo: { flex: 1, gap: 6 },
  bookTitle: { ...typeScale.titleMd, color: colors.onSurface },
  bookMeta: { ...typeScale.specimenIndex, color: colors.onSurfaceVariant },
  bookProgressTrack: {
    height: spacing.hairline,
    backgroundColor: colors.outlineFaint,
    marginTop: 2,
  },
  bookProgressFill: { height: spacing.hairline, backgroundColor: colors.secondary },
  bookProgressLabel: { ...typeScale.labelMono, color: colors.secondary, minWidth: 44, textAlign: 'right' },
  bookRight: { alignItems: 'flex-end', gap: 6, minWidth: 56 },
  continueTag: { ...typeScale.specimenIndex, color: colors.secondary },
  newTag: { ...typeScale.specimenIndex, color: colors.onSurfaceVariant },
  unsupported: { paddingHorizontal: spacing.gutter, paddingTop: 40 },
  unsupportedTitle: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 2,
    marginBottom: 8,
  },
  unsupportedBody: { ...typeScale.bodySm, color: colors.onSurfaceVariant, maxWidth: 340 },
  empty: { paddingTop: 40 },
  emptyTitle: { ...typeScale.labelMono, color: colors.onSurface, letterSpacing: 2, marginBottom: 8 },
  emptyText: { ...typeScale.bodySm, color: colors.onSurfaceVariant, maxWidth: 320 },
  suggestions: { marginTop: 28 },
  suggestTitle: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 2,
    marginBottom: 4,
  },
});
