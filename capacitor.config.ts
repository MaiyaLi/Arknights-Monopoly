import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arknights.monopoly',
  appName: 'Arknights Monopoly',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
