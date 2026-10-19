// Must be the first import in the app entry: react-native-gesture-handler
// installs the native gesture responder before any other module loads. On the
// New Architecture a missing early import leaves touches/gestures unregistered.
import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Android-only: registerWidgetTaskHandler calls AppRegistry.registerHeadlessTask,
// which react-native-web lacks — calling it on web crashes at module load. The
// widget module is imported lazily because Expo Go ships no such native module.
if (Platform.OS === 'android') {
  void (async () => {
    try {
      const [{ registerWidgetTaskHandler }, { widgetTaskHandler }] = await Promise.all([
        import('react-native-android-widget'),
        import('./src/widgets/widgetTaskHandler'),
      ]);
      registerWidgetTaskHandler(widgetTaskHandler);
    } catch (err) {
      console.warn('[widget] Widget task handler not registered:', err);
    }
  })();
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
