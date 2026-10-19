/**
 * widgetSyncService — pushes fresh streak data to the home-screen widget.
 *
 * Call after any event that can change the streak (session completed, stats
 * refreshed) and once after app bootstrap. No-ops on non-Android platforms
 * (react-native-android-widget's web/iOS builds are inert no-ops).
 */

import { Platform } from 'react-native';
import { streakService } from './streakService';

export const WIDGET_NAME = 'Streak';

export async function syncStreakWidget(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    // Lazy: Expo Go has no android-widget module, so this must fail at call time.
    const [{ requestWidgetUpdate }, { StreakWidget }] = await Promise.all([
      import('react-native-android-widget'),
      import('../widgets/StreakWidget'),
    ]);
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <StreakWidget streak={streakService.getStreak()} />,
    });
  } catch (error) {
    console.warn('[widget] syncStreakWidget failed:', error);
  }
}
