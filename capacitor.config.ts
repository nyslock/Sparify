import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sparify.app',
  appName: 'Sparify',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
};

export default config;
