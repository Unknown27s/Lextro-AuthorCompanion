/**
 * About Screen — Type Foundry
 *
 * The "ABOUT LEXTRO" page, surfaced from the Settings menu (ABOUT LEXTRO row).
 * Rendered inside a full-screen Modal hosted by ScreenShell so the 5-tab
 * navigator stays untouched. Brutalist specimen-sheet language: mono index
 * tags, hairline rules, no shadows, sharp corners.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, typeScale, spacing, frame } from '../theme';

export default function AboutScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();

  const stackRows: { label: string; value: string }[] = [
    { label: 'ENGINE', value: 'REACT NATIVE 0.86' },
    { label: 'RUNTIME', value: 'EXPO SDK 57' },
    { label: 'TYPECHECK', value: 'TYPESCRIPT 6' },
    { label: 'STATE', value: 'REDUX TOOLKIT' },
    { label: 'SEARCH', value: 'SQLITE FTS5' },
    { label: 'SCHEDULER', value: 'SM-2 SPACED REPETITION' },
    { label: 'LEXICON', value: 'EDMT · 110,000+ WORDS' },
    { label: 'STORAGE', value: 'ASYNCSTORAGE + SQLITE' },
  ];

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>[ABOUT]</Text>
          <Text style={styles.topBarIndex}>[NO. 007]</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.iconBtn}
          accessibilityLabel="Close"
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero wordmark */}
        <View style={styles.hero}>
          <Text style={styles.wordmark}>LEXTRO</Text>
          <Text style={styles.tagline}>AUTHOR VOCABULARY COMPANION</Text>
          <View style={styles.hairline} />
        </View>

        {/* Mission */}
        <View style={styles.block}>
          <Text style={styles.body}>
            A type-foundry specimen sheet for words you save. Each word is
            treated as a typographic specimen — numbered, indexed, and set in
            a display face worthy of a poster.
          </Text>
        </View>

        {/* Specimen note */}
        <View style={styles.block}>
          <Text style={styles.body}>
            Zero backend. Zero database. Zero monthly costs. Forever free.
          </Text>
        </View>

        {/* Tech stack */}
        <View style={[frame.card, styles.stackCard]}>
          <Text style={styles.specimenHeader}>[ ENTRY. 007 ] TECH STACK</Text>
          {stackRows.map((row) => (
            <View key={row.label} style={styles.stackRow}>
              <Text style={[typeScale.labelMono, styles.stackLabel]}>
                {row.label}
              </Text>
              <Text style={[typeScale.labelMono, styles.stackValue]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Offline note */}
        <View style={[frame.card, styles.offlineCard]}>
          <Text style={[typeScale.specimenIndex, styles.offlineText]}>
            ALL DATA STORED LOCALLY · NO ACCOUNT REQUIRED · FULLY OFFLINE
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[typeScale.specimenIndex, styles.footerText]}>
            VERSION 1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
  },
  topBarTitle: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1.5,
  },
  topBarIndex: {
    ...typeScale.specimenIndex,
    color: colors.secondary,
    letterSpacing: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    backgroundColor: colors.surfaceLowest,
  },
  icon: {
    fontFamily: fonts.mono,
    fontSize: 18,
    lineHeight: 20,
    color: colors.onSurface,
  },
  scroll: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 28,
  },
  wordmark: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 48,
    letterSpacing: -1.92,
    color: colors.onSurface,
  },
  tagline: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 2,
    marginTop: 6,
  },
  hairline: {
    width: '100%',
    height: spacing.hairline,
    backgroundColor: colors.outline,
    marginTop: 20,
  },
  block: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
  },
  body: {
    ...typeScale.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  specimenHeader: {
    ...typeScale.specimenIndex,
    color: colors.secondary,
    letterSpacing: 2,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  stackCard: {
    marginHorizontal: spacing.gutter,
    marginTop: 4,
    paddingBottom: 4,
  },
  stackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outlineVariant,
  },
  stackLabel: {
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  stackValue: {
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  offlineCard: {
    marginHorizontal: spacing.gutter,
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  offlineText: {
    color: colors.outline,
    letterSpacing: 1,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingBottom: 40,
  },
  footerText: {
    color: colors.outline,
    letterSpacing: 1,
  },
});
