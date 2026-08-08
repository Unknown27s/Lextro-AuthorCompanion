/**
 * Screen Shell — shared header + settings for every tab screen.
 *
 * Renders the global Header (LEXTRO wordmark, ⌕ search, ☰ settings) above
 * the screen's own content, plus the SettingsModal. Search defaults to
 * navigating to the Saved/Library tab; screens can override via onSearchClick.
 */

import React, { useState } from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Header from './Header';
import SettingsModal from './SettingsModal';
import CameraModal from './CameraModal';
import AboutScreen from '../screens/AboutScreen';
import DailyReminderScreen from '../screens/DailyReminderScreen';
import PracticeSettingsScreen from '../screens/PracticeSettingsScreen';
import type { TabParamList } from '../navigation/AppNavigator';
import { colors } from '../theme';

interface ScreenShellProps {
  children: React.ReactNode;
  onSearchClick?: () => void;
}

export default function ScreenShell({ children, onSearchClick }: ScreenShellProps) {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [dailyReminderOpen, setDailyReminderOpen] = useState(false);
  const [practiceSettingsOpen, setPracticeSettingsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Header
        onSearchClick={onSearchClick ?? (() => navigation.navigate('Saved'))}
        onSettingsClick={() => setSettingsOpen(true)}
        onCameraClick={() => setCameraOpen(true)}
      />
      {children}
      <CameraModal visible={cameraOpen} onClose={() => setCameraOpen(false)} />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onEditProfile={() => navigation.navigate('Profile')}
        onChangePassword={() => navigation.navigate('Profile')}
        onExportData={() => navigation.navigate('Profile')}
        onAbout={() => setAboutOpen(true)}
        onDailyReminder={() => setDailyReminderOpen(true)}
        onPracticeSettings={() => setPracticeSettingsOpen(true)}
      />
      <Modal
        visible={aboutOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAboutOpen(false)}
      >
        <AboutScreen onClose={() => setAboutOpen(false)} />
      </Modal>
      <Modal
        visible={dailyReminderOpen}
        animationType="slide"
        onRequestClose={() => setDailyReminderOpen(false)}
      >
        <DailyReminderScreen onClose={() => setDailyReminderOpen(false)} />
      </Modal>
      <Modal
        visible={practiceSettingsOpen}
        animationType="slide"
        onRequestClose={() => setPracticeSettingsOpen(false)}
      >
        <PracticeSettingsScreen onClose={() => setPracticeSettingsOpen(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
