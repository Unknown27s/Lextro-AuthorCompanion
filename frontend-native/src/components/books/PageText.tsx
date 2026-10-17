/**
 * PageText — one page of prose with every word tappable.
 *
 * Words are rendered as inline nested <Text> spans so the paragraph still
 * wraps naturally, while each span keeps its own press target.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../../theme';
import { normalizeToken } from '../../services/bookWordIndex';

interface PageTextProps {
  text: string;
  onWordPress: (word: string) => void;
  activeWord?: string | null;
  fontSize?: number;
}

const WORD_OR_GAP = /([A-Za-z][A-Za-z'-]*)/g;
const STARTS_WITH_LETTER = /^[A-Za-z]/;

export function PageText({ text, onWordPress, activeWord, fontSize = 19 }: PageTextProps) {
  const parts = useMemo(() => text.split(WORD_OR_GAP), [text]);

  return (
    <Text style={[styles.page, { fontSize, lineHeight: Math.round(fontSize * 1.75) }]}>
      {parts.map((part, index) => {
        const token = STARTS_WITH_LETTER.test(part) ? normalizeToken(part) : null;
        if (!token) {
          return <Text key={index}>{part}</Text>;
        }
        const isActive = activeWord === token;
        return (
          <Text
            key={index}
            style={isActive ? styles.wordActive : undefined}
            onPress={() => onWordPress(token)}
            suppressHighlighting
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  page: {
    fontFamily: fonts.body,
    color: colors.onSurface,
  },
  wordActive: {
    color: colors.secondary,
    textDecorationLine: 'underline',
  },
});
