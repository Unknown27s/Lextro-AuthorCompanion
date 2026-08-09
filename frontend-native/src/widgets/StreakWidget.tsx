'use no memo';

/**
 * Streak Widget — Android home-screen widget.
 *
 * Small Type Foundry card: `05 DAY STREAK` (blue mono number + ink-60 label)
 * over a 7-square pip row. Mirrors the in-app StreakCard small variant.
 * Renders with react-native-android-widget primitives only.
 */

import React from 'react';
import {
  FlexWidget,
  TextWidget,
  type FlexWidgetStyle,
  type TextWidgetStyle,
} from 'react-native-android-widget';
import type { StreakDay, StreakInfo } from '../services/streakService';

interface StreakWidgetProps {
  streak: StreakInfo;
}

function getPipStyle(state: StreakDay['state']): FlexWidgetStyle {
  switch (state) {
    case 'done':
      return { ...PIP_STYLE, ...PIP_DONE_STYLE };
    case 'freeze':
      return { ...PIP_STYLE, ...PIP_FREEZE_STYLE };
    case 'miss':
    case 'future':
      return { ...PIP_STYLE, ...PIP_MISS_STYLE };
    default:
      return { ...PIP_STYLE };
  }
}

const CARD_STYLE: FlexWidgetStyle = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#747878',
  borderRadius: 4,
  padding: 14,
  flexDirection: 'column',
  justifyContent: 'center',
};

const NUMBER_STYLE: TextWidgetStyle = {
  fontFamily: 'JetBrainsMono_700Bold',
  fontSize: 22,
  color: '#0037de',
};

const LABEL_STYLE: TextWidgetStyle = {
  fontFamily: 'JetBrainsMono_500Medium',
  fontSize: 12,
  color: '#444748',
  letterSpacing: 1,
};

const HEAD_ROW_STYLE: FlexWidgetStyle = {
  flexDirection: 'row',
  alignItems: 'flex-end',
  flexGap: 6,
};

const PIPS_STYLE: FlexWidgetStyle = {
  flexDirection: 'row',
  flexGap: 4,
  marginTop: 8,
};

const PIP_STYLE: FlexWidgetStyle = {
  width: 12,
  height: 12,
  borderWidth: 1,
  borderColor: '#747878',
};

const PIP_DONE_STYLE: FlexWidgetStyle = {
  backgroundColor: '#000000',
  borderColor: '#000000',
};

const PIP_FREEZE_STYLE: FlexWidgetStyle = {
  backgroundColor: '#0037de',
  borderColor: '#0037de',
};

const PIP_MISS_STYLE: FlexWidgetStyle = {
  backgroundColor: '#ffffff',
};

export function StreakWidget({ streak }: StreakWidgetProps) {
  const number = String(streak.current).padStart(2, '0');

  return (
    <FlexWidget style={CARD_STYLE}>
      <FlexWidget style={HEAD_ROW_STYLE}>
        <TextWidget text={number} style={NUMBER_STYLE} />
        <TextWidget text="DAY STREAK" style={LABEL_STYLE} />
      </FlexWidget>
      <FlexWidget style={PIPS_STYLE}>
        {streak.last7.map((day) => (
          <FlexWidget key={day.date} style={getPipStyle(day.state)} />
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
