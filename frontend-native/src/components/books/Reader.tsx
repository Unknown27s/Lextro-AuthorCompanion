/**
 * Reader — full-screen paginated reader for a book.
 *
 * Owns the current page, last-read persistence and bookmarks. Word taps bubble
 * up via `onWordPress` so the host screen owns the single WordDetailModal.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, typeScale } from '../../theme';
import type { Book, BookPage, PageWord, WordHit } from '../../types/books';
import { bookmarkService } from '../../services/bookmarkService';
import { buildWordIndex, searchWords, wordsForPage } from '../../services/bookWordIndex';
import { PageText } from './PageText';

interface ReaderProps {
  book: Book;
  pages: BookPage[];
  startPage: number;
  onClose: () => void;
  onWordPress: (word: string) => void;
  activeWord?: string | null;
  overlay?: React.ReactNode;
}

const MAX_SEARCH_RESULTS = 40;
const MIN_SEARCH_QUERY = 2;

export function Reader({ book, pages, startPage, onClose, onWordPress, activeWord, overlay }: ReaderProps) {
  const lastPage = Math.max(0, pages.length - 1);
  const [pageIndex, setPageIndex] = useState(() => Math.min(Math.max(0, startPage), lastPage));
  const [panelOpen, setPanelOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const page = pages[pageIndex];
  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length >= MIN_SEARCH_QUERY;

  const pageWords = useMemo<PageWord[]>(
    () => (page ? wordsForPage(buildWordIndex([page]), page.index) : []),
    [page],
  );

  const searchIndex = useMemo(
    () => (searching ? buildWordIndex(pages) : []),
    [searching, pages],
  );

  const results = useMemo<WordHit[]>(
    () => (searching ? searchWords(searchIndex, trimmedQuery).slice(0, MAX_SEARCH_RESULTS) : []),
    [searching, searchIndex, trimmedQuery],
  );

  useEffect(() => {
    if (!page) return;
    bookmarkService.setPosition(book.id, pageIndex, pages.length);
    setBookmarked(bookmarkService.isBookmarked(book.id, page.index));
  }, [book.id, page, pageIndex, pages.length]);

  const goToPage = useCallback(
    (next: number) => {
      setPageIndex(Math.min(Math.max(0, next), lastPage));
      scroller.current?.scrollTo({ y: 0, animated: false });
    },
    [lastPage],
  );

  const toggleBookmark = useCallback(() => {
    if (!page) return;
    setBookmarked(
      bookmarkService.toggleBookmark({
        bookId: book.id,
        pageIndex: page.index,
        chapterTitle: page.chapterTitle,
        excerpt: page.text,
      }),
    );
  }, [book.id, page]);

  if (!page) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.container}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>THIS BOOK HAS NO PAGES</Text>
            <TouchableOpacity onPress={onClose} style={styles.navBtn} activeOpacity={0.8}>
              <Text style={styles.navText}>✕ CLOSE</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const progress = pages.length > 1 ? ((pageIndex + 1) / pages.length) * 100 : 100;
  const atFirst = pageIndex <= 0;
  const atLast = pageIndex >= lastPage;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.topBtn}
            accessibilityLabel="Close reader"
            activeOpacity={0.8}
          >
            <Text style={styles.topBtnText}>✕ CLOSE</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            {book.title.toUpperCase()}
          </Text>
          <TouchableOpacity
            onPress={toggleBookmark}
            style={styles.topBtn}
            accessibilityLabel="Toggle bookmark"
            activeOpacity={0.8}
          >
            <Text style={[styles.topBtnText, bookmarked && styles.markActive]}>
              {bookmarked ? '★ MARKED' : '☆ MARK'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scroller}
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageMetaRow}>
            <Text style={styles.chapterLabel}>{page.chapterTitle ?? 'TEXT'}</Text>
            <Text style={styles.pageLabel}>
              [PAGE {String(page.index + 1).padStart(3, '0')}]
            </Text>
          </View>
          <PageText text={page.text} onWordPress={onWordPress} activeWord={activeWord} />
        </ScrollView>

        {panelOpen && (
          <View style={styles.panel}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="SEARCH ALL WORDS"
              placeholderTextColor={colors.onSurfaceVariant}
              style={styles.search}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search words in this book"
            />
            {searching && results.length === 0 ? (
              <Text style={styles.panelEmpty}>NO MATCHES FOR “{trimmedQuery.toUpperCase()}”</Text>
            ) : (
              <ScrollView
                style={styles.chipScroll}
                contentContainerStyle={styles.chipWrap}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {searching
                  ? results.map((hit) => (
                      <TouchableOpacity
                        key={hit.word}
                        style={styles.chip}
                        onPress={() => goToPage(hit.pageIndexes[0])}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.chipText}>{hit.word}</Text>
                        <Text style={styles.chipMeta}>{hit.pageIndexes.length}p</Text>
                      </TouchableOpacity>
                    ))
                  : pageWords.map((entry) => (
                      <TouchableOpacity
                        key={entry.word}
                        style={styles.chip}
                        onPress={() => onWordPress(entry.word)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.chipText}>{entry.word}</Text>
                        {entry.count > 1 && <Text style={styles.chipMeta}>{entry.count}×</Text>}
                      </TouchableOpacity>
                    ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={() => goToPage(pageIndex - 1)}
              disabled={atFirst}
              style={[styles.navBtn, atFirst && styles.navDisabled]}
              accessibilityLabel="Previous page"
              activeOpacity={0.8}
            >
              <Text style={styles.navText}>◀ PREV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPanelOpen((open) => !open)}
              style={[styles.wordsBtn, panelOpen && styles.wordsBtnActive]}
              accessibilityLabel="Toggle page vocabulary"
              activeOpacity={0.8}
            >
              <Text style={[styles.wordsBtnText, panelOpen && styles.wordsBtnTextActive]}>
                {panelOpen ? '▾' : '▴'} WORDS ({pageWords.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goToPage(pageIndex + 1)}
              disabled={atLast}
              style={[styles.navBtn, atLast && styles.navDisabled]}
              accessibilityLabel="Next page"
              activeOpacity={0.8}
            >
              <Text style={styles.navText}>NEXT ▶</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pageCounter}>
            [PAGE {String(pageIndex + 1).padStart(3, '0')} / {String(pages.length).padStart(3, '0')}]
          </Text>
        </View>
      </SafeAreaView>
      {overlay}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    ...typeScale.labelMono,
    color: colors.onSurfaceVariant,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
  },
  topBtn: {
    paddingVertical: 4,
  },
  topBtnText: {
    ...typeScale.labelMono,
    color: colors.onSurface,
  },
  markActive: {
    color: colors.secondary,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    ...typeScale.labelMono,
    color: colors.onSurfaceVariant,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 20,
    paddingBottom: 32,
  },
  pageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  chapterLabel: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
  },
  pageLabel: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
  },
  panel: {
    borderTopWidth: spacing.hairline,
    borderTopColor: colors.outline,
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
    maxHeight: 240,
  },
  search: {
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  panelEmpty: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
    paddingVertical: 16,
    textAlign: 'center',
  },
  chipScroll: {
    marginTop: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: spacing.hairline,
    borderColor: colors.outlineVariant,
    borderRadius: spacing.radius,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surfaceLowest,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.onSurface,
  },
  chipMeta: {
    ...typeScale.specimenIndex,
    color: colors.secondary,
  },
  footer: {
    borderTopWidth: spacing.hairline,
    borderTopColor: colors.outline,
    paddingHorizontal: spacing.gutter,
    paddingTop: 10,
    paddingBottom: 12,
  },
  progressTrack: {
    height: spacing.hairline,
    backgroundColor: colors.outlineFaint,
    marginBottom: 12,
  },
  progressFill: {
    height: spacing.hairline,
    backgroundColor: colors.secondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navBtn: {
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  navDisabled: {
    opacity: 0.35,
  },
  navText: {
    ...typeScale.labelMono,
    color: colors.onSurface,
  },
  wordsBtn: {
    flex: 1,
    alignItems: 'center',
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  wordsBtnActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.selectedContainer,
  },
  wordsBtnText: {
    ...typeScale.labelMono,
    color: colors.onSurface,
  },
  wordsBtnTextActive: {
    color: colors.secondary,
  },
  pageCounter: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 10,
  },
});
