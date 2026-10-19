/**
 * Lextro — Author Vocabulary Companion (React Native)
 *
 * Root app component. Handles:
 * - Splash screen lifecycle (Keeps visible until storage is hydrated)
 * - Storage hydration (AsyncStorage → in-memory cache for services)
 * - Redux Provider + React Navigation container
 */

import React, { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { bootstrap, warmup } from './src/bootstrap';
import { syncStreakWidget } from './src/services/widgetSyncService';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

// Keep the splash screen visible until we're ready to render the app
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Fast path: storage hydration + auth session only. The first frame
        // renders without waiting on the dictionary / SQLite warmup.
        await bootstrap();
        syncStreakWidget();
      } catch (e) {
        console.warn('[app] Bootstrap failed:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }

      // Heavy caches warm up after the first interactions settle.
      InteractionManager.runAfterInteractions(() => {
        warmup().catch((e) => console.warn('[app] Warmup failed:', e));
      });
    };

    prepareApp();
  }, []);

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
