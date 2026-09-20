import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.elabsolution.app',
  appName: 'myELAB',
  webDir: 'dist',
  // Local bundled assets. A remote `server.url` is the App Store 4.2
  // "repackaged website" rejection pattern — do not add one.
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0B1423',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B1423',
      overlaysWebView: false,
    },
  },
  ios: {
    contentInset: 'always',
    scheme: 'App',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
