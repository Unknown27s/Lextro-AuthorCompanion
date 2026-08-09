/**
 * widgetSyncService — pushes fresh streak data to the home-screen widget.
 *
 * Call after any event that can change the streak (session completed, stats
 * refreshed) and once after app bootstrap. No-ops on non-Android platforms
 * (react-native-android-widget's web/iOS builds are inert no-ops).
 */

import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { streakService } from './streakService';
import { StreakWidget } from '../widgets/StreakWidget';

export const WIDGET_NAME = 'Streak';

export async function syncStreakWidget(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <StreakWidget streak={streakService.getStreak()} />,
    });
  } catch (error) {
    console.warn('[widget] syncStreakWidget failed:', error);
  }
}
