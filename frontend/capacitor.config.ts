import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.lextro.app',
    appName: 'Author Vocabulary Companion',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    plugins: {
        PushNotifications: {
            presentationOption: 'toast',
        },
        SplashScreen: {
            launchShowDuration: 0,
            launchAutoHide: true,
            showSpinner: false,
        },
    },
};

export default config;
