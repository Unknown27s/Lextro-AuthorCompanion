/**
 * Profile Screen — Type Foundry
 *
 * Identity plate + telemetry, matching the README Profile spec:
 * - `[NO. 001] IDENTITY` plate (name, purpose, member-since)
 * - Telemetry strip: SPECIMENS COLLECTED · STREAK · MASTERY
 * - Activity log: recent saved words as a hairline-ruled table
 *
 * No forced login — works fully offline. Identity reflects the local
 * auth profile when one exists, otherwise a neutral local reader.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { localStorageApi } from '../api/client';
import { authService } from '../services/authService';
import {
  spacedRepetitionService,
  Statistics,
} from '../services/spacedRepetitionService';
import ScreenShell from '../components/ScreenShell';
import { colors, fonts, typeScale, spacing, frame, buttons } from '../theme';

const pad = (n: number): string => String(n).padStart(3, '0');

const getFormattedDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'TODAY';
    if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
    return date
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      .toUpperCase();
  } catch {
    return 'UNKNOWN';
  }
};

interface ActivityRow {
  no: string;
  word: string;
  status: string;
  added: string;
}

export default function ProfileScreen() {
  const [stats, setStats] = useState<Statistics>(spacedRepetitionService.getStatistics());
  const [savedCount, setSavedCount] = useState(0);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exportPassword, setExportPassword] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  const loadProfile = useCallback(() => {
    const vocab = localStorageApi.getUserVocab();
    setSavedCount(vocab.length);
    setStats(spacedRepetitionService.getStatistics());

    // Most recent first
    const sorted = [...vocab].sort(
      (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime(),
    );

    setActivity(
      sorted.slice(0, 20).map((sv, i) => ({
        no: pad(i + 1),
        word: sv.vocab_item.word,
        status: sv.status.toUpperCase(),
        added: getFormattedDate(sv.added_at),
      })),
    );

    const user = authService.getCurrentUser();
    setUserName(user?.name || null);
    setPasswordEnabled(!!user?.password);
  }, []);

  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    const user = authService.getCurrentUser();
    if (user) {
      authService.updateLearningPurpose(user.id, 'writing');
      setUserName(nameInput.trim());
      setEditingName(false);
    }
  };

  const handleTogglePassword = () => {
    if (passwordEnabled) {
      setPasswordEnabled(false);
      setPassword('');
      setConfirmPassword('');
    } else {
      setPasswordEnabled(true);
    }
  };

  const handleSetPassword = () => {
    if (password.length < 4) {
      Alert.alert('Password', 'Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password', 'Passwords do not match.');
      return;
    }
    const user = authService.getCurrentUser();
    if (user) {
      authService.changePassword(password, password);
      setPasswordEnabled(true);
      setPassword('');
      setConfirmPassword('');
      Alert.alert('Password', 'Password set successfully.');
    }
  };

  const handleExportData = () => {
    if (passwordEnabled && exportPassword.length < 4) {
      Alert.alert('Export', 'Enter a password (min 4 characters) to protect the export.');
      return;
    }
    if (passwordEnabled && exportPassword !== password) {
      Alert.alert('Export', 'Password does not match your account password.');
      return;
    }
    const vocab = localStorageApi.getUserVocab();
    const data = {
      exportedAt: new Date().toISOString(),
      passwordProtected: passwordEnabled,
      words: vocab.map((v) => v.vocab_item),
    };
    const json = JSON.stringify(data, null, 2);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  return (
    <ScreenShell>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>[PROFILE]</Text>
        <Text style={styles.topBarIndex}>[NO. 001]</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Identity plate */}
        <View style={styles.identityPlate}>
          <Text style={styles.identityOverline}>[ IDENTITY ]</Text>
          <Text style={styles.identityName}>
            {userName ? userName.toUpperCase() : 'LOCAL READER'}
          </Text>
          <View style={styles.identityMeta}>
            <View style={frame.chip}>
              <Text style={styles.identityChipText}>
                STATUS: ACTIVE
              </Text>
            </View>
            <Text style={styles.identitySince}>
              {userName ? 'MEMBER' : 'OFFLINE'} · LOCAL
            </Text>
          </View>
        </View>

        {/* Telemetry strip */}
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>SPECIMENS COLLECTED</Text>
            <Text style={styles.statValue}>{String(savedCount).padStart(3, '0')}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>STREAK</Text>
            <Text style={[styles.statValue, styles.statValueAccent]}>
              {String(stats.streakDays).padStart(3, '0')}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>MASTERY</Text>
            <Text style={styles.statValue}>{String(stats.mastered).padStart(3, '0')}</Text>
          </View>
        </View>

        {/* Accuracy + due row */}
        <View style={styles.secondaryStats}>
          <Text style={styles.secondaryStat}>
            DUE: <Text style={styles.secondaryStatAccent}>{stats.dueToday}</Text>
          </Text>
          <Text style={styles.secondaryStat}>
            ACCURACY: <Text style={styles.secondaryStatAccent}>{stats.accuracy}%</Text>
          </Text>
          <Text style={styles.secondaryStat}>
            SESSIONS: <Text style={styles.secondaryStatAccent}>{stats.totalSessions}</Text>
          </Text>
        </View>

        {/* Edit Profile */}
        <View style={styles.section}>
          <View style={styles.sectionRuleRow}>
            <Text style={styles.sectionTitle}>IDENTITY</Text>
            <View style={styles.sectionRule} />
          </View>
          {editingName ? (
            <View style={styles.inlineEdit}>
              <TextInput
                style={styles.textInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={colors.outline}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={[buttons.primary, styles.inlineBtn]}
                onPress={handleSaveName}
                activeOpacity={0.8}
              >
                <Text style={buttons.primaryText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setEditingName(true);
                setNameInput(userName || '');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.optionLabel}>NAME</Text>
              <Text style={styles.optionValue}>
                {userName ? userName.toUpperCase() : 'TAP TO SET'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Password */}
        <View style={styles.section}>
          <View style={styles.sectionRuleRow}>
            <Text style={styles.sectionTitle}>PASSWORD</Text>
            <View style={styles.sectionRule} />
          </View>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleTogglePassword}
            activeOpacity={0.7}
          >
            <Text style={styles.optionLabel}>ENABLE PASSWORD</Text>
            <View style={[frame.chip, passwordEnabled && styles.chipActive]}>
              <Text style={[styles.chipText, passwordEnabled && styles.chipTextActive]}>
                {passwordEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>
          {passwordEnabled && (
            <View style={styles.passwordForm}>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="New password (min 4 chars)"
                placeholderTextColor={colors.outline}
              />
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={colors.outline}
              />
              <TouchableOpacity
                style={[buttons.primary, styles.inlineBtn]}
                onPress={handleSetPassword}
                activeOpacity={0.8}
              >
                <Text style={buttons.primaryText}>SET PASSWORD</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Export Data */}
        <View style={styles.section}>
          <View style={styles.sectionRuleRow}>
            <Text style={styles.sectionTitle}>DATA</Text>
            <View style={styles.sectionRule} />
          </View>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleExportData}
            activeOpacity={0.7}
          >
            <Text style={styles.optionLabel}>EXPORT DATA</Text>
            <Text style={styles.optionValue}>
              {passwordEnabled ? 'PASSWORD PROTECTED' : 'NO PASSWORD'}
            </Text>
          </TouchableOpacity>
          {passwordEnabled && (
            <View style={styles.passwordForm}>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={exportPassword}
                onChangeText={setExportPassword}
                placeholder="Enter password to export"
                placeholderTextColor={colors.outline}
              />
              <TouchableOpacity
                style={[buttons.primary, styles.inlineBtn]}
                onPress={handleExportData}
                activeOpacity={0.8}
              >
                <Text style={buttons.primaryText}>EXPORT</Text>
              </TouchableOpacity>
              {exportSuccess && (
                <Text style={styles.exportSuccess}>EXPORTED</Text>
              )}
            </View>
          )}
        </View>

        {/* Section rule */}
        <View style={styles.sectionRuleRow}>
          <Text style={styles.sectionTitle}>ACTIVITY LOG</Text>
          <View style={styles.sectionRule} />
        </View>

        {/* Activity log table */}
        <View style={styles.logHeader}>
          <Text style={[styles.logHeaderCell, styles.logColNo]}>NO.</Text>
          <Text style={[styles.logHeaderCell, styles.logColWord]}>WORD</Text>
          <Text style={[styles.logHeaderCell, styles.logColStatus]}>STATUS</Text>
          <Text style={[styles.logHeaderCell, styles.logColAdded]}>ADDED</Text>
        </View>

        {activity.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>NO ACTIVITY</Text>
            <Text style={styles.emptyText}>
              Saved words will appear here, indexed and dated.
            </Text>
          </View>
        ) : (
          activity.map((row) => (
            <View key={`${row.word}-${row.no}`} style={styles.logRow}>
              <Text style={[styles.logCell, styles.logColNo, styles.logCellIndex]}>
                {row.no}
              </Text>
              <Text style={[styles.logCell, styles.logColWord, styles.logCellWord]}>
                {row.word}
              </Text>
              <View style={[styles.logColStatus]}>
                <View style={[frame.chip, styles.statusChip]}>
                  <Text style={styles.statusChipText}>{row.status}</Text>
                </View>
              </View>
              <Text style={[styles.logCell, styles.logColAdded, styles.logCellAdded]}>
                {row.added}
              </Text>
            </View>
          ))
        )}

        {/* Footer note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            ALL DATA STORED LOCALLY · NO ACCOUNT REQUIRED
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 16,
    backgroundColor: colors.surfaceLowest,
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
  identityPlate: {
    backgroundColor: colors.surfaceLowest,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
    paddingHorizontal: spacing.gutter,
    paddingVertical: 24,
    alignItems: 'center',
  },
  identityOverline: {
    ...typeScale.specimenIndex,
    color: colors.secondary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  identityName: {
    ...typeScale.headlineMd,
    color: colors.onSurface,
    marginBottom: 12,
    textAlign: 'center',
  },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identityChipText: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  identitySince: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
  },
  statCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: spacing.gutter,
    alignItems: 'center',
    borderRightWidth: spacing.hairline,
    borderRightColor: colors.outlineVariant,
  },
  statLabel: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    ...typeScale.headlineSm,
    color: colors.onSurface,
  },
  statValueAccent: {
    color: colors.secondary,
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outlineVariant,
  },
  secondaryStat: {
    ...typeScale.labelMonoRegular,
    color: colors.onSurfaceVariant,
  },
  secondaryStatAccent: {
    color: colors.secondary,
  },
  sectionRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1.5,
    marginRight: 12,
  },
  sectionRule: {
    flex: 1,
    height: spacing.hairline,
    backgroundColor: colors.outline,
  },
  logHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 8,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surfaceLowest,
  },
  logHeaderCell: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 1,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surfaceLowest,
  },
  logCell: {
    ...typeScale.bodySm,
    color: colors.onSurface,
  },
  logColNo: {
    width: 44,
  },
  logColWord: {
    flex: 1,
  },
  logColStatus: {
    width: 72,
    alignItems: 'center',
  },
  logColAdded: {
    width: 64,
    textAlign: 'right',
  },
  logCellIndex: {
    ...typeScale.specimenIndex,
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  logCellWord: {
    fontFamily: fonts.displaySemiBold,
    fontWeight: '600',
  },
  logCellAdded: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  statusChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusChipText: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.gutter,
    backgroundColor: colors.surfaceLowest,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outlineVariant,
  },
  emptyTitle: {
    ...typeScale.labelMono,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  emptyText: {
    ...typeScale.bodySm,
    color: colors.outline,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: 16,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outlineVariant,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  optionLabel: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  optionValue: {
    ...typeScale.labelMono,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    padding: 12,
    ...typeScale.bodySm,
    color: colors.onSurface,
    marginBottom: 8,
  },
  inlineEdit: {
    paddingVertical: 8,
  },
  inlineBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  passwordForm: {
    paddingTop: 8,
  },
  chipActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.selectedContainer,
  },
  chipText: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: colors.secondary,
  },
  exportSuccess: {
    ...typeScale.labelMono,
    color: colors.success,
    letterSpacing: 1,
    marginTop: 8,
    textAlign: 'center',
  },
});
