/**
 * App Navigator — Type Foundry
 *
 * Bottom tab navigator with 5 tabs:
 * - Home (specimen poster, daily word)
 * - Saved (Library — alphabetical index)
 * - Books (reading room — catalogue, reader, vocabulary)
 * - Practice (spaced-repetition review)
 * - Profile (identity plate + telemetry + activity log)
 *
 * Daily Reminder and Practice Settings are NOT bottom tabs — they live behind
 * the Settings (☰) sheet, opened as full-screen modals from ScreenShell.
 *
 * Safe-area aware: tab bar height = fixed content (56) + bottom inset
 * (gesture bar / home indicator), so it never overlaps the device nav.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import SavedScreen from '../screens/SavedScreen';
import BooksScreen from '../screens/BooksScreen';
import PracticeScreen from '../screens/PracticeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { TabBarIcon } from './TabBarIcon';
import { colors, fonts, spacing } from '../theme';

export type TabParamList = {
  Home: undefined;
  Saved: undefined;
  Books: undefined;
  Practice: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_BAR_HEIGHT = 56;

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 8);

  const getTabBarStyle = (isActive: boolean) => ({
    backgroundColor: colors.surfaceLowest,
    borderTopWidth: isActive ? 2 : spacing.hairline,
    borderTopColor: isActive ? colors.secondary : colors.outline,
    height: TAB_BAR_HEIGHT + bottomInset,
    paddingBottom: bottomInset,
    paddingTop: 4,
  });

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon routeName={route.name} focused={focused} color={color} size={size} />
          ),
          tabBarActiveTintColor: colors.secondary,
          tabBarInactiveTintColor: colors.outline,
          tabBarLabelStyle: {
            fontFamily: fonts.mono,
            fontSize: 10,
            fontWeight: '500',
            letterSpacing: 0.6,
            textTransform: 'uppercase' as const,
            marginBottom: 2,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            tabBarStyle: getTabBarStyle(navigation.isFocused()),
          })}
        />
        <Tab.Screen
          name="Saved"
          component={SavedScreen}
          options={({ navigation }) => ({
            tabBarStyle: getTabBarStyle(navigation.isFocused()),
          })}
        />
        <Tab.Screen
          name="Books"
          component={BooksScreen}
          options={({ navigation }) => ({
            tabBarStyle: getTabBarStyle(navigation.isFocused()),
          })}
        />
        <Tab.Screen
          name="Practice"
          component={PracticeScreen}
          options={({ navigation }) => ({
            tabBarStyle: getTabBarStyle(navigation.isFocused()),
          })}
        />
         <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={({ navigation }) => ({
            tabBarStyle: getTabBarStyle(navigation.isFocused()),
          })}
        />
       </Tab.Navigator>
    </NavigationContainer>
  );
}
