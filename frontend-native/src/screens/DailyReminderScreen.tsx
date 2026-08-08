/**
 * Daily Reminder Screen — configure a daily practice reminder.
 *
 * Uses expo-notifications to schedule a local notification at the
 * chosen time each day. Toggled on/off from this screen.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import ScreenShell from '../components/ScreenShell';
import { colors, typeScale, spacing, frame, buttons } from '../theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface DailyReminderScreenProps {
  onClose?: () => void;
}

export default function DailyReminderScreen({ onClose }: DailyReminderScreenProps) {
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [saved, setSaved] = useState(false);

  const toggleEnabled = useCallback(() => setEnabled((prev) => !prev), []);

  const handleSave = useCallback(async () => {
    if (enabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lextro — Daily Practice',
          body: 'Your daily vocabulary practice is ready!',
          data: { type: 'daily-reminder' },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.CALENDAR,
          hour,
          minute,
          repeats: true,
        },
      });
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [enabled, hour, minute]);

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
        <Text style={styles.title}>[DAILY REMINDER]</Text>

        <View style={[frame.card, styles.optionCard]}>
          <Text style={styles.optionLabel}>ENABLE REMINDER</Text>
          <TouchableOpacity
            style={[styles.toggle, enabled && styles.toggleActive]}
            onPress={toggleEnabled}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.toggleThumb,
                enabled && styles.toggleThumbActive,
              ]}
            />
          </TouchableOpacity>
        </View>

        {enabled && (
          <>
            <View style={[frame.card, styles.timeRow]}>
              <Text style={styles.optionLabel}>HOUR</Text>
              <View style={styles.timeControls}>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => setHour((h) => (h > 0 ? h - 1 : 23))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{String(hour).padStart(2, '0')}</Text>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => setHour((h) => (h < 23 ? h + 1 : 0))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[frame.card, styles.timeRow]}>
              <Text style={styles.optionLabel}>MINUTE</Text>
              <View style={styles.timeControls}>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => setMinute((m) => (m > 0 ? m - 1 : 59))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{String(minute).padStart(2, '0')}</Text>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => setMinute((m) => (m < 59 ? m + 1 : 0))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[buttons.primary, styles.saveBtn]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={buttons.primaryText}>
                {saved ? 'SAVED' : 'SAVE REMINDER'}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
  },
  optionLabel: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.outlineVariant,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.secondary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.onSurface,
  },
  toggleThumbActive: {
    backgroundColor: colors.onPrimary,
    marginLeft: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    fontSize: 18,
  },
  timeValue: {
    ...typeScale.headlineSm,
    color: colors.onSurface,
    minWidth: 32,
    textAlign: 'center',
  },
  saveBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
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
