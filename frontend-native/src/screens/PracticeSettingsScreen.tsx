/**
 * Practice Settings Screen — configure practice activity options.
 *
 * Controls accuracy basis (rolling window size) and streak freeze
 * allowance. Settings persist in localStorage.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import ScreenShell from '../components/ScreenShell';
import { colors, typeScale, spacing, frame, buttons } from '../theme';

const ACCURACY_OPTIONS = [
  { label: 'LAST 10 ANSWERS', value: 10 },
  { label: 'LAST 50 ANSWERS', value: 50 },
  { label: 'LAST 100 ANSWERS', value: 100 },
  { label: 'ALL TIME', value: 0 },
];

const FREEZE_OPTIONS = [
  { label: '0 FREEZES', value: 0 },
  { label: '1 FREEZE / MONTH', value: 1 },
  { label: '2 FREEZES / MONTH', value: 2 },
];

const ACCURACY_KEY = 'practiceAccuracy';
const FREEZE_KEY = 'practiceFreezeLimit';

interface PracticeSettingsScreenProps {
  onClose?: () => void;
}

export default function PracticeSettingsScreen({ onClose }: PracticeSettingsScreenProps) {
  const [accuracyBasis, setAccuracyBasis] = useState(50);
  const [freezeLimit, setFreezeLimit] = useState(2);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(ACCURACY_KEY, String(accuracyBasis));
      localStorage.setItem(FREEZE_KEY, String(freezeLimit));
    } catch {
      // storage unavailable — ignore
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [accuracyBasis, freezeLimit]);

  return (
    <ScreenShell>
      <View style={styles.closeBar}>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeText}>✕ CLOSE</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>[PRACTICE SETTINGS]</Text>

        {/* Accuracy basis */}
        <Text style={styles.sectionLabel}>ACCURACY BASIS</Text>
        {ACCURACY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              frame.card,
              styles.optionRow,
              accuracyBasis === opt.value && styles.optionRowActive,
            ]}
            onPress={() => setAccuracyBasis(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                accuracyBasis === opt.value && styles.optionTextActive,
              ]}
            >
              {opt.label}
            </Text>
            {accuracyBasis === opt.value && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Streak freeze allowance */}
        <Text style={[styles.sectionLabel, styles.sectionLabelMargin]}>
          STREAK FREEZES
        </Text>
        {FREEZE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              frame.card,
              styles.optionRow,
              freezeLimit === opt.value && styles.optionRowActive,
            ]}
            onPress={() => setFreezeLimit(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                freezeLimit === opt.value && styles.optionTextActive,
              ]}
            >
              {opt.label}
            </Text>
            {freezeLimit === opt.value && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[buttons.primary, styles.saveBtn]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={buttons.primaryText}>
            {saved ? 'SAVED' : 'SAVE SETTINGS'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.gutter,
    paddingBottom: 32,
  },
  title: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 2,
    marginBottom: 20,
  },
  sectionLabel: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionLabelMargin: {
    marginTop: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
  },
  optionRowActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.selectedContainer,
  },
  optionText: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  optionTextActive: {
    color: colors.secondary,
  },
  checkmark: {
    ...typeScale.labelMono,
    color: colors.secondary,
    fontWeight: '700',
  },
  saveBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 24,
  },
  closeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
  },
  closeText: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1,
  },
});
