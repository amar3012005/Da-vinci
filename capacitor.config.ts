import type { CapacitorConfig } from '@capacitor/cli';

// Development identity; confirm before creating store records/signing profiles.
// Ship bundled assets. Never point production server.url at the website.
const config: CapacitorConfig = {
  appId: 'com.singulancelabs.hivemind',
  appName: 'HIVE-MIND',
  webDir: 'build',
  backgroundColor: '#faf9f4',
  android: { webContentsDebuggingEnabled: false },
  ios: { webContentsDebuggingEnabled: false, contentInset: 'never' },
  plugins: {
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
    StatusBar: { style: 'LIGHT', backgroundColor: '#faf9f4' },
  },
};
export default config;
