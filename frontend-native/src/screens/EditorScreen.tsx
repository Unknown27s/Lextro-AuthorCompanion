import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { dictionaryApi, localStorageApi } from '../api/client';
import { VocabItem } from '../types';
import InlineWordSuggestion from '../components/InlineWordSuggestion';
import ScreenShell from '../components/ScreenShell';
import { colors, typeScale, spacing, frame, buttons } from '../theme';

export default function EditorScreen() {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<VocabItem[]>([]);
  const [searching, setSearching] = useState(false);

  const extractWords = (input: string): string[] => {
    const words = input.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || [];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const w of words) {
      const clean = w.replace(/['-]/g, '');
      if (clean.length >= 5 && !seen.has(clean)) {
        seen.add(clean);
        unique.push(clean);
      }
    }
    return unique.slice(0, 5);
  };

  const scanDocument = useCallback(async () => {
    const candidates = extractWords(text);
    if (candidates.length === 0) return;
    setSearching(true);
    setSuggestions([]);
    try {
      const found: VocabItem[] = [];
      for (const word of candidates) {
        try {
          const entry = await dictionaryApi.getWord(word);
          if (entry) {
            found.push(dictionaryApi.transformToVocabItem(entry, word));
          }
        } catch {
          // skip unknown words
        }
        if (found.length >= 3) break;
      }
      setSuggestions(found);
    } finally {
      setSearching(false);
    }
  }, [text]);

  const saveWord = (word: VocabItem) => {
    localStorageApi.saveVocab(word.id, word, 'saved');
    setSuggestions((prev) => prev.filter((w) => w.id !== word.id));
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>[EDITOR]</Text>
        <Text style={styles.subtitle}>
          PASTE A DOCUMENT TO DISCOVER VOCABULARY WORTH SAVING.
        </Text>

        <TextInput
          style={styles.input}
          multiline
          placeholder="PASTE YOUR TEXT HERE…"
          placeholderTextColor={colors.outline}
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[
            styles.scanBtn,
            (searching || text.trim().length < 20) && styles.scanBtnDisabled,
          ]}
          onPress={scanDocument}
          disabled={searching || text.trim().length < 20}
        >
          {searching ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={styles.scanBtnText}>SCAN FOR VOCABULARY</Text>
          )}
        </TouchableOpacity>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            <View style={styles.sectionRuleRow}>
              <Text style={styles.suggestionsTitle}>SUGGESTED WORDS</Text>
              <View style={styles.sectionRule} />
            </View>
            {suggestions.map((w) => (
              <InlineWordSuggestion
                key={w.id}
                word={w}
                onSave={() => saveWord(w)}
                onDismiss={() => setSuggestions((prev) => prev.filter((x) => x.id !== w.id))}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.gutter, paddingBottom: 32 },
  title: { ...typeScale.labelMono, color: colors.onSurface, letterSpacing: 2, marginBottom: 4 },
  subtitle: { ...typeScale.specimenIndex, color: colors.outline, letterSpacing: 0.5, marginBottom: 16 },
  input: {
    minHeight: 200,
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    padding: 16,
    ...typeScale.bodyLg,
    color: colors.onSurface,
    textAlignVertical: 'top',
  },
  scanBtn: {
    backgroundColor: colors.primary,
    borderWidth: spacing.hairline,
    borderColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  scanBtnDisabled: { backgroundColor: colors.outlineVariant, borderColor: colors.outlineVariant },
  scanBtnText: { ...typeScale.labelMono, color: colors.onPrimary, letterSpacing: 1 },
  suggestionsBox: { marginTop: 8 },
  sectionRuleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  suggestionsTitle: { ...typeScale.labelMono, color: colors.onSurface, letterSpacing: 1.5, marginRight: 12 },
  sectionRule: { flex: 1, height: spacing.hairline, backgroundColor: colors.outline },
});
