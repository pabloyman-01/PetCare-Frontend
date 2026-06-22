import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.petcare.app',
  appName: 'PetCare',
  webDir: 'dist/petcare-frontend/browser',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
