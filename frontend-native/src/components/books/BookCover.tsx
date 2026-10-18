import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../theme';

interface BookCoverProps {
  uri?: string;
  format: string;
}

export function BookCover({ uri, format }: BookCoverProps) {
  return (
    <View style={[styles.frame, !uri && styles.frameEmpty]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={styles.fallback} numberOfLines={1}>
          {format.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 46,
    height: 68,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceLowest,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameEmpty: { borderStyle: 'dashed' },
  image: { width: '100%', height: '100%' },
  fallback: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
});
