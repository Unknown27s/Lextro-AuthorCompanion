/**
 * Library Screen — Type Foundry
 *
 * Rebuilt to match the Type Foundry "Library" reference (specimen index):
 * - Top bar: mono label, search affordance
 * - Minimal search field (hairline frame)
 * - Alphabetical index with sticky letter headers
 * - Rows: `[NO. xxx]` mono index + word + POS chip, hairline rules
 * - Selected row: electric-blue tint + blue text + blue chip (interactive state)
 *
 * Data source: localStorageApi.getUserVocab() (deduped by word).
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
} from 'react-native';
import { localStorageApi } from '../api/client';
import { sqliteService } from '../services/sqliteService';
import { VocabItem } from '../types';
import ScreenShell from '../components/ScreenShell';
import WordDetailModal from '../components/WordDetailModal';
import { colors, fonts, typeScale, spacing, frame } from '../theme';

interface LibraryRow {
  no: string; // zero-padded catalogue number
  item: VocabItem;
}

interface LibrarySection {
  title: string; // single letter A–Z
  data: LibraryRow[];
}

const POS_ABBR: Record<string, string> = {
  adjective: 'ADJ',
  noun: 'NOUN',
  verb: 'VERB',
  adverb: 'ADV',
  pronoun: 'PRON',
  preposition: 'PREP',
  conjunction: 'CONJ',
  interjection: 'INTERJ',
  determiner: 'DET',
  'proper noun': 'NOUN',
};

const toPosAbbr = (pos: string): string =>
  POS_ABBR[pos.toLowerCase()] || pos.slice(0, 4).toUpperCase() || 'WORD';

const pad = (n: number): string => String(n).padStart(3, '0');

export default function SavedScreen() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dictRows, setDictRows] = useState<LibraryRow[]>([]);
  const [detailWord, setDetailWord] = useState<VocabItem | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Dictionary fallback: the Library is a mirror of saved vocab, so with
  // nothing saved yet every query would be a dead end. Surface offline
  // dictionary hits (SQLite) so search always returns specimens.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setDictRows([]);
      return;
    }
    let cancelled = false;
    sqliteService
      .searchFts(q, 50)
      .then((rows) => {
        if (cancelled) return;
        setDictRows(
          rows.map((r, i) => ({
            no: pad(i + 1),
            item: {
              id: r.word.toLowerCase(),
              word: r.word,
              pos: r.pos || 'word',
              difficulty: (r.difficulty as VocabItem['difficulty']) || 'medium',
              definition: r.definition,
              example_corpus: r.example_corpus,
              ai_example: r.ai_example,
              synonyms: r.synonyms,
              antonyms: r.antonyms,
              tags: r.tags,
              created_at: r.created_at,
            },
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setDictRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const buildSections = useCallback((): LibrarySection[] => {
    const savedVocab = localStorageApi.getUserVocab();
    const seen = new Set<string>();
    const rows: LibraryRow[] = [];

    for (const sv of savedVocab) {
      const key = sv.vocab_item.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ no: pad(rows.length + 1), item: sv.vocab_item });
    }

    rows.sort((a, b) => a.item.word.localeCompare(b.item.word));

    const filtered = query.trim()
      ? rows.filter(
          (r) =>
            r.item.word.toLowerCase().includes(query.trim().toLowerCase()) ||
            r.item.definition.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : rows;

    const source = filtered.length > 0 ? filtered : dictRows;

    const sections: LibrarySection[] = [];
    for (const row of source) {
      const letter = row.item.word.charAt(0).toUpperCase();
      const last = sections[sections.length - 1];
      if (last && last.title === letter) {
        last.data.push(row);
      } else {
        sections.push({ title: letter, data: [row] });
      }
    }
    return sections;
  }, [query, dictRows]);

  const sections = useMemo(buildSections, [query, dictRows]);

  const renderHeader = useCallback(() => (
    <View style={styles.searchWrap}>
      <View style={styles.searchField}>
        <Text style={styles.searchMarker}>⌕</Text>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="SEARCH LIBRARY"
          placeholderTextColor={colors.outline}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Text style={styles.searchClear}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.searchCount}>
        SPECIMENS: {String(sections.reduce((n, s) => n + s.data.length, 0)).padStart(3, '0')}
      </Text>
    </View>
  ), [query, sections]);

  const renderSectionHeader = ({ section }: { section: LibrarySection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLetter}>{section.title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );

  const renderRow = ({ item: row }: { item: LibraryRow }) => {
    const isSelected = selectedId === row.item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setSelectedId(isSelected ? null : row.item.id);
          setDetailWord(row.item);
        }}
        style={[styles.row, isSelected && styles.rowSelected]}
      >
        <Text style={[styles.rowNo, isSelected && styles.rowTextActive]}>{`[NO. ${row.no}]`}</Text>
        <Text
          style={[styles.rowWord, isSelected && styles.rowTextActive]}
          numberOfLines={1}
        >
          {row.item.word}
        </Text>
        <View style={[styles.posChip, isSelected && styles.posChipActive]}>
          <Text style={[styles.posChipText, isSelected && styles.rowTextActive]}>
            {toPosAbbr(row.item.pos)}
          </Text>
        </View>
        {isSelected && <Text style={styles.rowCaret}>→</Text>}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>NO SPECIMENS YET</Text>
      <Text style={styles.emptyText}>
        Save words while reading and they will be indexed here —
        alphabetically, numbered, ready for review.
      </Text>
    </View>
  );

  return (
    <ScreenShell onSearchClick={() => searchInputRef.current?.focus()}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarLabel}>[LIBRARY]</Text>
        <Text style={styles.topBarTitle}>TYPE FOUNDRY</Text>
        <Text style={styles.topBarCount}>
          {String(sections.reduce((n, s) => n + s.data.length, 0)).padStart(3, '0')}
        </Text>
      </View>

      {/* Search header lifted out of the list so the TextInput never
          gets remounted while typing (RNWeb ListHeaderComponent remount
          bug: only the first keystroke registers). */}
      {renderHeader()}

      <SectionList
        sections={sections}
        extraData={query}
        keyExtractor={(row) => row.item.id}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {detailWord && (
        <WordDetailModal
          item={detailWord}
          isSaved={localStorageApi.getUserVocab().some(
            (v) => v.vocab_item.word.toLowerCase() === detailWord.word.toLowerCase(),
          )}
          onClose={() => setDetailWord(null)}
          onSave={(id, item) => {
            const target = item ?? detailWord;
            const exists = localStorageApi.getUserVocab().some(
              (v) => v.vocab_item.word.toLowerCase() === target.word.toLowerCase(),
            );
            if (!exists) {
              localStorageApi.saveVocab(id, target, 'saved');
            } else {
              const itemToRemove = localStorageApi.getUserVocab().find(
                (v) => v.vocab_item.word.toLowerCase() === target.word.toLowerCase(),
              );
              if (itemToRemove) {
                localStorageApi.removeVocab(itemToRemove.id);
              }
            }
          }}
          onPractice={() => setDetailWord(null)}
          onUseInDocument={() => setDetailWord(null)}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // ── Top bar ────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
  },
  topBarLabel: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
  },
  topBarTitle: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 2,
  },
  topBarCount: {
    ...typeScale.specimenIndex,
    color: colors.secondary,
  },
  // ── Search ─────────────────────────────────────────────────────────────
  searchWrap: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.gutter,
    paddingBottom: 8,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radiusSharp,
    backgroundColor: colors.surfaceLowest,
    paddingHorizontal: 12,
    height: 44,
  },
  searchMarker: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.onSurfaceVariant,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typeScale.labelMono,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  searchClear: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.outline,
    paddingHorizontal: 4,
  },
  searchCount: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    marginTop: 8,
  },
  // ── Sections ───────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.surface,
  },
  sectionLetter: {
    ...typeScale.headlineSm,
    color: colors.onSurface,
    marginRight: 12,
  },
  sectionRule: {
    flex: 1,
    height: spacing.hairline,
    backgroundColor: colors.outline,
  },
  // ── Rows ───────────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 14,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  rowSelected: {
    backgroundColor: colors.selectedContainer,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    borderBottomColor: colors.outlineVariant,
  },
  rowNo: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    width: 72,
  },
  rowWord: {
    ...typeScale.titleMd,
    color: colors.onSurface,
    flex: 1,
    marginRight: 12,
  },
  rowTextActive: {
    color: colors.secondary,
  },
  posChip: {
    ...frame.chip,
    backgroundColor: colors.surfaceLowest,
  },
  posChipActive: {
    ...frame.chipActive,
  },
  posChipText: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  rowCaret: {
    ...typeScale.labelMono,
    color: colors.secondary,
    marginLeft: 8,
  },
  // ── Empty state ────────────────────────────────────────────────────────
  empty: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typeScale.labelMono,
    color: colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: 12,
  },
  emptyText: {
    ...typeScale.bodySm,
    color: colors.outline,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
});
