/**
 * Widget task handler — runs headless (no React tree) on widget events.
 *
 * Fired by Android for WIDGET_ADDED / WIDGET_UPDATE / WIDGET_RESIZED /
 * WIDGET_DELETED / WIDGET_CLICK. Storage must be hydrated here because the
 * headless context starts with an empty in-memory localStorage cache.
 */

import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { hydrateStorage } from '../utils/storage';
import { streakService } from '../services/streakService';
import { StreakWidget } from './StreakWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction } = props;

  if (
    widgetAction === 'WIDGET_ADDED' ||
    widgetAction === 'WIDGET_UPDATE' ||
    widgetAction === 'WIDGET_RESIZED'
  ) {
    await hydrateStorage();
    const streak = streakService.getStreak();
    props.renderWidget(<StreakWidget streak={streak} />);
  }
}
