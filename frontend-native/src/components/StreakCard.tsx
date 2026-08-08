/**
 * Streak Card — mono streak readout with 7-day pips.
 *
 * Small variant: `12 DAY STREAK` (blue number, ink-60 label) for the Practice
 * home. Large variant: bigger number + the 7-day pip row (filled ink = done,
 * blue = frozen, outline = missed/upcoming) for the Home tab.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { streakService, StreakInfo } from '../services/streakService';
import { colors, typeScale, spacing, fonts } from '../theme';

interface StreakCardProps {
  variant?: 'small' | 'large';
  streak?: StreakInfo;
}

export default function StreakCard({ variant = 'small', streak }: StreakCardProps) {
  const info = streak ?? streakService.getStreak();
  const isLarge = variant === 'large';

  return (
    <View style={[styles.container, isLarge && styles.containerLarge]}>
      <View style={styles.row}>
        <Text style={[styles.number, isLarge && styles.numberLarge]}>{info.current}</Text>
        <Text style={[styles.label, isLarge && styles.labelLarge]}>
          DAY STREAK
        </Text>
      </View>
      <View style={styles.pips}>
        {info.last7.map((day) => (
          <View
            key={day.date}
            style={[
              styles.pip,
              day.state === 'done' && styles.pipDone,
              day.state === 'freeze' && styles.pipFreeze,
              (day.state === 'miss' || day.state === 'future') && styles.pipMiss,
            ]}
          />
        ))}
      </View>
      {info.freezesUsedThisMonth > 0 && (
        <Text style={styles.freezeNote}>
          {info.freezesUsedThisMonth}/{info.freezeLimit} FREEZE{info.freezesUsedThisMonth > 1 ? 'S' : ''} USED THIS MONTH
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  containerLarge: {
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  number: {
    ...typeScale.headlineSm,
    color: colors.secondary,
    fontFamily: fonts.monoBold,
    letterSpacing: -1,
  },
  numberLarge: {
    ...typeScale.headlineMd,
    color: colors.secondary,
    fontFamily: fonts.monoBold,
    letterSpacing: -1,
  },
  label: {
    ...typeScale.labelMono,
    color: colors.outline,
    letterSpacing: 1,
  },
  labelLarge: {
    ...typeScale.labelMono,
    color: colors.outline,
    letterSpacing: 1,
    fontSize: 14,
  },
  pips: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  pip: {
    width: 12,
    height: 12,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
  },
  pipDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pipFreeze: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  pipMiss: {
    backgroundColor: colors.surfaceLowest,
  },
  freezeNote: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 0.5,
    marginTop: 6,
  },
});
