/**
 * Tab bar icon component — Type Foundry.
 * Minimal monochrome glyphs (no emoji, no icon lib) drawn in the label color.
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { fonts } from '../theme';

interface TabBarIconProps {
  routeName: string;
  focused: boolean;
  color: string;
  size: number;
}

const glyphs: Record<string, string> = {
  Home: '⌂',
  Saved: '▤',
  Editor: '✎',
  Practice: '▶',
  Profile: '◎',
  DailyReminder: '📅',
  PracticeSettings: '⚙️',
};

export function TabBarIcon({ routeName, focused, color, size }: TabBarIconProps) {
  const glyph = glyphs[routeName] || '•';
  return (
    <View style={styles.wrap}>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: size - 2,
          lineHeight: size,
          color,
          fontWeight: focused ? '700' : '400',
        }}
      >
        {glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
});
